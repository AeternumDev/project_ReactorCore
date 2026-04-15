import { ReactorState, GameEvent } from "./types";
import { PHYSICS } from "./constants";

const DT = PHYSICS.TICK_INTERVAL_MS / 1000;
const MIN_NEUTRON_FLUX = PHYSICS.DECAY_HEAT_FLOOR / PHYSICS.NOMINAL_POWER;
const FLUX_CAP = PHYSICS.PEAK_EXCURSION_POWER / PHYSICS.NOMINAL_POWER;

type DelayedGroups = ReactorState["delayedNeutronPrecursors"];

interface CoreDynamicsState {
  neutronFlux: number;
  delayedNeutronPrecursors: DelayedGroups;
  iodineConcentration: number;
  xenonConcentration: number;
  fuelTemperature: number;
  fuelSurfaceTemperature: number;
  claddingTemperature: number;
  coolantTemperature: number;
  steamVoidFraction: number;
}

interface CoreControlState {
  controlRods: number;
  reactivityMargin: number;
}

export function createEquilibriumDelayedNeutronPrecursors(neutronFlux: number): DelayedGroups {
  const safeFlux = Math.max(neutronFlux, MIN_NEUTRON_FLUX);
  const groups = PHYSICS.DELAYED_NEUTRON_GROUPS.map(({ beta, lambda }) =>
    (beta / (PHYSICS.PROMPT_NEUTRON_LIFETIME * lambda)) * safeFlux
  );

  return [
    groups[0],
    groups[1],
    groups[2],
    groups[3],
    groups[4],
    groups[5],
  ];
}

/**
 * Berechnet den nächsten Reaktorzustand mit Punktkinetik, verzögerten Neutronen,
 * gekoppelter Iod-/Xenon-Dynamik und vereinfachter Mehrknoten-Thermik.
 */
export function calculateNextState(state: ReactorState): Partial<ReactorState> {
  const events: GameEvent[] = [...state.events];
  const elapsed = state.elapsedSeconds + DT;

  let manualRods = state.manualRods;
  let autoRods = state.autoRods;
  let shortenedRods = state.shortenedRods;
  const safetyRods = state.safetyRods;

  if (state.powerMode === "auto") {
    const powerError = state.thermalPower - state.powerSetpoint;
    const adjustment = Math.sign(powerError) * Math.min(Math.abs(powerError) / 500, 0.5) * DT;
    autoRods = Math.max(0, Math.min(PHYSICS.AUTO_RODS_MAX, autoRods + adjustment));
  }

  const controlRods = Math.round(manualRods + autoRods + shortenedRods + safetyRods);
  const reactivityMargin = controlRods;

  const core = integrateCoreDynamics(state, {
    controlRods,
    reactivityMargin,
  });

  const neutronFlux = clamp(core.neutronFlux, MIN_NEUTRON_FLUX, FLUX_CAP);
  const thermalPower = clamp(
    neutronFlux * PHYSICS.NOMINAL_POWER,
    PHYSICS.DECAY_HEAT_FLOOR,
    PHYSICS.PEAK_EXCURSION_POWER
  );
  const coolantFlowRate = state.activeCoolantPumps * PHYSICS.COOLANT_FLOW_PER_PUMP;
  const effectiveCooling = calculateEffectiveCooling(
    state.activeCoolantPumps,
    state.eccsEnabled,
    core.coolantTemperature
  );
  const steamPressure = calculateSteamPressure(thermalPower, core.steamVoidFraction, effectiveCooling);
  const coreTemperatureZones = calculateCoreTemperatureZones(
    controlRods,
    core.fuelTemperature,
    core.fuelSurfaceTemperature,
    core.steamVoidFraction,
    core.xenonConcentration
  );

  let turbineSpeed = state.turbineSpeed;
  let generatorOutput = state.generatorOutput;

  if (state.turbineConnected && state.turbineValveOpen > 0) {
    const steamDrive =
      (steamPressure / PHYSICS.STEAM_PRESSURE_NOMINAL) *
      (state.turbineValveOpen / 100) *
      PHYSICS.TURBINE_NOMINAL_SPEED;
    turbineSpeed += (steamDrive - turbineSpeed) * 0.05 * DT;
  } else {
    turbineSpeed = Math.max(0, turbineSpeed - PHYSICS.TURBINE_SPINDOWN_RATE * DT);
  }
  turbineSpeed = Math.max(0, Math.min(PHYSICS.TURBINE_MAX_SPEED, turbineSpeed));

  if (state.turbineConnected && turbineSpeed > 500) {
    generatorOutput =
      thermalPower *
      PHYSICS.TURBINE_EFFICIENCY *
      (turbineSpeed / PHYSICS.TURBINE_NOMINAL_SPEED) *
      (state.turbineValveOpen / 100);
  } else {
    generatorOutput = Math.max(0, generatorOutput - 20 * DT);
  }
  generatorOutput = Math.max(0, generatorOutput);

  let drumSeparatorLevel = state.drumSeparatorLevel;
  const steamOutRate = core.steamVoidFraction * 5;
  const waterInRate = state.feedWaterFlow / PHYSICS.FEED_WATER_NOMINAL;
  drumSeparatorLevel += (waterInRate - steamOutRate - 0.5) * DT * 2;
  drumSeparatorLevel = clamp(drumSeparatorLevel, 0, 100);

  let bazTriggered = state.bazTriggered;
  const bazArmed = state.bazArmed;
  if (bazArmed && !bazTriggered && !state.az5Active) {
    const bazPowerLimit = state.powerSetpoint * PHYSICS.BAZ_POWER_THRESHOLD;
    if (
      thermalPower > bazPowerLimit ||
      steamPressure > PHYSICS.BAZ_PRESSURE_THRESHOLD ||
      coolantFlowRate < PHYSICS.BAZ_COOLANT_FLOW_MIN
    ) {
      bazTriggered = true;
      addEventIfNew(events, elapsed, "BAZ AUSGELÖST — SCHNELLE NOTABSCHALTUNG", "critical");
    }
  }

  let newSafetyRods = safetyRods;
  if (bazTriggered) {
    newSafetyRods = Math.min(PHYSICS.SAFETY_RODS_MAX, safetyRods + 20 * DT);
  }

  if (state.az5Active) {
    const rodsPerTick = PHYSICS.AZ5_ROD_INSERTION_RATE * DT;
    const insertedRods = distributeAz5Insertion(
      {
        manualRods,
        autoRods,
        shortenedRods,
        safetyRods: newSafetyRods,
      },
      rodsPerTick
    );
    manualRods = insertedRods.manualRods;
    autoRods = insertedRods.autoRods;
    shortenedRods = insertedRods.shortenedRods;
    newSafetyRods = insertedRods.safetyRods;
  }

  let az5Active = state.az5Active;
  let az5Timer = state.az5Timer;
  if (az5Active) {
    az5Timer = Math.max(0, az5Timer - DT);
    if (az5Timer <= 0) {
      az5Active = false;
      az5Timer = 0;
    }
  }

  let isExploded = state.isExploded;
  let testCompleted = state.testCompleted;

  if (core.fuelTemperature >= PHYSICS.FUEL_TEMP_MELTDOWN) {
    isExploded = true;
    addEventIfNew(events, elapsed, "KERNSCHMELZE — REAKTOR 4 EXPLODIERT", "alarm");
  }

  if (steamPressure >= PHYSICS.STEAM_PRESSURE_CRITICAL) {
    isExploded = true;
    addEventIfNew(events, elapsed, "DRUCKROHRVERSAGEN — DAMPFEXPLOSION", "alarm");
  }

  if (elapsed >= PHYSICS.TEST_DURATION_SECONDS && !isExploded) {
    testCompleted = true;
  }

  const subcoolingMargin = PHYSICS.COOLANT_TEMP_BOILING - core.coolantTemperature;
  if (subcoolingMargin < PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD && state.activeCoolantPumps >= 6) {
    const cavitationSeverity = clamp01(
      1 - subcoolingMargin / PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD
    );
    if (cavitationSeverity > 0.5) {
      addEventIfNew(events, elapsed, "KAVITATION IN KÜHLMITTELPUMPEN", "warning");
    }
  }

  const finalControlRods = Math.round(manualRods + autoRods + shortenedRods + newSafetyRods);

  if (finalControlRods < PHYSICS.MINIMUM_SAFE_RODS) {
    addEventIfNew(events, elapsed, "MINIMALE STABABSENKUNG UNTERSCHRITTEN", "alarm");
  }

  if (core.fuelTemperature > PHYSICS.FUEL_TEMP_WARNING) {
    addEventIfNew(events, elapsed, "BRENNSTOFFTEMPERATUR KRITISCH", "critical");
  }

  if (core.xenonConcentration > 0.5 && state.xenonConcentration <= 0.5) {
    addEventIfNew(events, elapsed, "XENON-VERGIFTUNG ERHÖHT", "warning");
  }

  if (steamPressure > PHYSICS.STEAM_PRESSURE_WARNING && state.steamPressure <= PHYSICS.STEAM_PRESSURE_WARNING) {
    addEventIfNew(events, elapsed, "DAMPFDRUCK ERHÖHT", "warning");
  }

  if (core.steamVoidFraction > 0.3 && state.steamVoidFraction <= 0.3) {
    addEventIfNew(events, elapsed, "DAMPFBLASENANTEIL KRITISCH", "warning");
  }

  if (finalControlRods < PHYSICS.OZR_WARNING) {
    addEventIfNew(events, elapsed, "OZR UNTER WARNGRENZE", "warning");
  }

  if (finalControlRods < PHYSICS.OZR_MINIMUM_SAFE) {
    addEventIfNew(events, elapsed, "OZR KRITISCH NIEDRIG", "alarm");
  }

  if (drumSeparatorLevel < PHYSICS.DRUM_LEVEL_LOW) {
    addEventIfNew(events, elapsed, "TROMMELABSCHEIDER WASSERSTAND NIEDRIG", "warning");
  }

  if (turbineSpeed > PHYSICS.TURBINE_MAX_SPEED * 0.95) {
    addEventIfNew(events, elapsed, "TURBINE ÜBERDREHZAHL", "critical");
  }

  if (!bazArmed) {
    addEventIfNew(events, elapsed, "BAZ DEAKTIVIERT — SCHUTZABSCHALTUNG BLOCKIERT", "warning");
  }

  return {
    neutronFlux,
    thermalPower,
    delayedNeutronPrecursors: core.delayedNeutronPrecursors,
    iodineConcentration: core.iodineConcentration,
    xenonConcentration: core.xenonConcentration,
    coolantTemperature: core.coolantTemperature,
    coolantFlowRate,
    fuelTemperature: core.fuelTemperature,
    fuelSurfaceTemperature: core.fuelSurfaceTemperature,
    claddingTemperature: core.claddingTemperature,
    steamPressure,
    steamVoidFraction: core.steamVoidFraction,
    coreTemperatureZones,
    isExploded,
    testCompleted,
    events,
    lastPowerLevel: thermalPower,
    xenonBuildupRate: core.iodineConcentration - core.xenonConcentration,
    az5Active,
    az5Timer,
    controlRods: finalControlRods,
    manualRods,
    autoRods,
    shortenedRods,
    safetyRods: newSafetyRods,
    reactivityMargin: finalControlRods,
    turbineSpeed,
    generatorOutput,
    drumSeparatorLevel,
    bazTriggered,
    bazArmed,
  };
}

/**
 * AZ-5 Notabschalter: Graduelle Stabeinfahrt; der Graphit-Tip-Effekt ist nur
 * unter instabilen Niedrigleistungsbedingungen gefaehrlich.
 */
export function triggerAZ5(state: ReactorState): Partial<ReactorState> {
  const events = [...state.events];
  const currentControlRods = Math.round(
    state.manualRods + state.autoRods + state.shortenedRods + state.safetyRods
  );
  events.push({
    timestamp: state.elapsedSeconds,
    message: "AZ-5 AKTIVIERT — NOTABSCHALTUNG EINGELEITET",
    severity: 'critical',
  });

  // Stäbe werden NICHT sofort eingefahren — graduelle Einfahrt über 18 Sekunden (0,4 m/s)
  // Die Stabposition wird in calculateNextState schrittweise erhöht
  return {
    az5Active: true,
    az5Timer: PHYSICS.AZ5_FULL_INSERTION_TIME,
    az5PrePower: state.thermalPower,
    az5PreMargin: currentControlRods,
    az5PreVoid: state.steamVoidFraction,
    events,
  };
}

/**
 * BAZ manuell auslösen: Sicherheitsstäbe einfahren, KEIN Graphit-Spike.
 */
export function triggerBAZ(state: ReactorState): Partial<ReactorState> {
  const events = [...state.events];
  events.push({
    timestamp: state.elapsedSeconds,
    message: "BAZ MANUELL AUSGELÖST — SICHERHEITSSTÄBE EINFAHREN",
    severity: 'critical',
  });

  return {
    bazTriggered: true,
    events,
  };
}

function calculateAz5GraphiteSpikeFactor(state: ReactorState, az5Timer: number): number {
  const graphiteReactivity = calculateAz5GraphiteTipReactivity(state, az5Timer);
  if (graphiteReactivity <= 0) {
    return 1;
  }

  const normalizedWorth = graphiteReactivity / PHYSICS.AZ5_GRAPHITE_LOW_ORM_REACTIVITY;
  return 1 + normalizedWorth;
}

function calculateAz5GraphiteTipReactivity(state: ReactorState, az5Timer: number): number {
  const insertionElapsed = PHYSICS.AZ5_FULL_INSERTION_TIME - az5Timer;
  if (insertionElapsed >= PHYSICS.AZ5_GRAPHIT_SPIKE_DURATION) {
    return 0;
  }

  const spikePhase = 1 - insertionElapsed / PHYSICS.AZ5_GRAPHIT_SPIKE_DURATION;
  const refPower = state.az5PrePower;
  const refMargin = state.az5PreMargin;
  const refVoid = Math.max(state.steamVoidFraction, state.az5PreVoid);

  const lowPowerSeverity = clamp01(
    (PHYSICS.AZ5_GRAPHIT_POWER_THRESHOLD - refPower) /
    PHYSICS.AZ5_GRAPHIT_POWER_THRESHOLD
  );
  const lowMarginSeverity = clamp01(
    (PHYSICS.AZ5_GRAPHIT_MARGIN_THRESHOLD - refMargin) /
    (PHYSICS.AZ5_GRAPHIT_MARGIN_THRESHOLD - PHYSICS.OZR_MINIMUM_SAFE)
  );
  const voidSeverity = clamp01(
    (refVoid - PHYSICS.AZ5_GRAPHIT_VOID_THRESHOLD) /
    (1 - PHYSICS.AZ5_GRAPHIT_VOID_THRESHOLD)
  );

  // Positive scram becomes relevant only when low power, low OZR and voiding
  // line up at the same time. In a healthy core, AZ-5 should shut the reactor down.
  const spikeSeverity = clamp01(lowPowerSeverity * (lowMarginSeverity * 0.6 + voidSeverity * 0.4));
  if (spikeSeverity <= 0) {
    return 0;
  }

  const peakReactivity = refMargin < PHYSICS.OZR_MINIMUM_SAFE
    ? PHYSICS.AZ5_GRAPHITE_LOW_ORM_REACTIVITY
    : PHYSICS.AZ5_GRAPHITE_BASE_REACTIVITY;

  return peakReactivity * spikeSeverity * spikePhase;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distributeAz5Insertion(
  rodGroups: Pick<ReactorState, 'manualRods' | 'autoRods' | 'shortenedRods' | 'safetyRods'>,
  rodsToInsert: number
): Pick<ReactorState, 'manualRods' | 'autoRods' | 'shortenedRods' | 'safetyRods'> {
  const next = { ...rodGroups };
  const rodLimits = [
    { key: 'manualRods', max: PHYSICS.MANUAL_RODS_MAX },
    { key: 'autoRods', max: PHYSICS.AUTO_RODS_MAX },
    { key: 'shortenedRods', max: PHYSICS.SHORTENED_RODS_MAX },
    { key: 'safetyRods', max: PHYSICS.SAFETY_RODS_MAX },
  ] as const;

  let remainingInsertion = rodsToInsert;
  while (remainingInsertion > 1e-6) {
    const movableGroups = rodLimits.filter(({ key, max }) => next[key] < max - 1e-6);
    if (movableGroups.length === 0) {
      break;
    }

    const totalHeadroom = movableGroups.reduce((sum, { key, max }) => sum + (max - next[key]), 0);
    if (totalHeadroom <= 1e-6) {
      break;
    }

    let insertedThisPass = 0;
    for (const { key, max } of movableGroups) {
      const headroom = max - next[key];
      const delta = Math.min(headroom, remainingInsertion * (headroom / totalHeadroom));
      next[key] += delta;
      insertedThisPass += delta;
    }

    if (insertedThisPass <= 1e-6) {
      break;
    }

    remainingInsertion -= insertedThisPass;
  }

  return next;
}

function integrateCoreDynamics(state: ReactorState, control: CoreControlState): CoreDynamicsState {
  const core: CoreDynamicsState = {
    neutronFlux: clamp(state.neutronFlux, MIN_NEUTRON_FLUX, FLUX_CAP),
    delayedNeutronPrecursors: normalizeDelayedNeutronPrecursors(
      state.delayedNeutronPrecursors,
      state.neutronFlux
    ),
    iodineConcentration: Math.max(0, state.iodineConcentration),
    xenonConcentration: clamp01(state.xenonConcentration),
    fuelTemperature: Math.max(PHYSICS.FUEL_TEMP_NOMINAL, state.fuelTemperature),
    fuelSurfaceTemperature: Math.max(state.coolantTemperature, state.fuelSurfaceTemperature),
    claddingTemperature: Math.max(state.coolantTemperature, state.claddingTemperature),
    coolantTemperature: Math.max(PHYSICS.COOLANT_TEMP_NOMINAL, state.coolantTemperature),
    steamVoidFraction: clamp01(state.steamVoidFraction),
  };

  const subDt = DT / PHYSICS.KINETICS_SUBSTEPS;
  for (let step = 0; step < PHYSICS.KINETICS_SUBSTEPS; step += 1) {
    const powerMW = clamp(
      Math.max(core.neutronFlux, MIN_NEUTRON_FLUX) * PHYSICS.NOMINAL_POWER,
      PHYSICS.DECAY_HEAT_FLOOR,
      PHYSICS.PEAK_EXCURSION_POWER
    );
    const effectiveCooling = calculateEffectiveCooling(
      state.activeCoolantPumps,
      state.eccsEnabled,
      core.coolantTemperature
    );
    const coolantTarget = calculateCoolantTarget(powerMW, effectiveCooling);
    const pressureEstimate = calculateSteamPressure(powerMW, core.steamVoidFraction, effectiveCooling);
    const saturationTemperature = calculateSaturationTemperature(pressureEstimate);
    const voidTarget = calculateVoidTarget(
      coolantTarget,
      saturationTemperature,
      powerMW,
      state.az5Active && state.az5Timer > 0 ? state.az5PreVoid : core.steamVoidFraction
    );
    const thermalTargets = calculateThermalTargets(powerMW, effectiveCooling, core.coolantTemperature);
    const totalReactivity = calculateTotalReactivity(state, control, core, powerMW);
    const delayedSource = PHYSICS.DELAYED_NEUTRON_GROUPS.reduce(
      (sum, group, index) => sum + group.lambda * core.delayedNeutronPrecursors[index],
      0
    );
    const neutronDot =
      ((totalReactivity - PHYSICS.TOTAL_DELAYED_NEUTRON_FRACTION) / PHYSICS.PROMPT_NEUTRON_LIFETIME) *
        core.neutronFlux +
      delayedSource;
    const poisonScale = PHYSICS.POISON_TIME_SCALE;
    const iodineDot =
      poisonScale *
      (PHYSICS.IODINE_YIELD_COEFFICIENT * core.neutronFlux -
        PHYSICS.IODINE_DECAY_CONSTANT * core.iodineConcentration);
    const xenonDot =
      poisonScale *
      (PHYSICS.XENON_DIRECT_YIELD_COEFFICIENT * core.neutronFlux +
        PHYSICS.IODINE_DECAY_CONSTANT * core.iodineConcentration -
        PHYSICS.XENON_DECAY_CONSTANT * core.xenonConcentration -
        PHYSICS.XENON_BURNUP_COEFFICIENT * core.neutronFlux * core.xenonConcentration);

    const nextPrecursors = [...core.delayedNeutronPrecursors] as DelayedGroups;
    PHYSICS.DELAYED_NEUTRON_GROUPS.forEach(({ beta, lambda }, index) => {
      const precursorDot =
        (beta / PHYSICS.PROMPT_NEUTRON_LIFETIME) * core.neutronFlux -
        lambda * core.delayedNeutronPrecursors[index];
      nextPrecursors[index] = Math.max(0, core.delayedNeutronPrecursors[index] + precursorDot * subDt);
    });

    core.neutronFlux = clamp(core.neutronFlux + neutronDot * subDt, 0, FLUX_CAP);
    core.delayedNeutronPrecursors = nextPrecursors;
    core.iodineConcentration = Math.max(0, core.iodineConcentration + iodineDot * subDt);
    core.xenonConcentration = clamp01(core.xenonConcentration + xenonDot * subDt);
    core.coolantTemperature = Math.max(
      PHYSICS.COOLANT_TEMP_NOMINAL,
      core.coolantTemperature +
        ((coolantTarget - core.coolantTemperature) / PHYSICS.COOLANT_TIME_CONSTANT) * subDt
    );
    core.steamVoidFraction = clamp01(
      core.steamVoidFraction +
        ((voidTarget - core.steamVoidFraction) / PHYSICS.VOID_TIME_CONSTANT) * subDt
    );
    core.claddingTemperature = Math.max(
      core.coolantTemperature,
      core.claddingTemperature +
        ((thermalTargets.claddingTemperature - core.claddingTemperature) /
          PHYSICS.CLADDING_TIME_CONSTANT) *
          subDt
    );
    core.fuelSurfaceTemperature = Math.max(
      core.claddingTemperature,
      core.fuelSurfaceTemperature +
        ((thermalTargets.fuelSurfaceTemperature - core.fuelSurfaceTemperature) /
          PHYSICS.FUEL_SURFACE_TIME_CONSTANT) *
          subDt
    );
    core.fuelTemperature = Math.max(
      PHYSICS.FUEL_TEMP_NOMINAL,
      core.fuelTemperature +
        ((thermalTargets.fuelTemperature - core.fuelTemperature) /
          PHYSICS.FUEL_CENTER_TIME_CONSTANT) *
          subDt
    );
  }

  return core;
}

function calculateTotalReactivity(
  state: ReactorState,
  control: CoreControlState,
  core: CoreDynamicsState,
  powerMW: number
): number {
  const rodFraction = control.controlRods / PHYSICS.MAX_CONTROL_RODS;
  const rodReactivity = -rodFraction * PHYSICS.TOTAL_ROD_WORTH;
  const powerReference = state.az5Active && state.az5Timer > 0 ? state.az5PrePower : powerMW;
  const lowPowerFactor = Math.max(
    1,
    PHYSICS.LOW_POWER_VOID_AMPLIFICATION -
      (PHYSICS.LOW_POWER_VOID_AMPLIFICATION - 1) * (powerReference / PHYSICS.TEST_POWER_TARGET)
  );
  const voidReactivity = core.steamVoidFraction * PHYSICS.VOID_COEFFICIENT * lowPowerFactor;
  const xenonReactivity = -core.xenonConcentration * PHYSICS.XENON_MAX_REACTIVITY_PENALTY;
  const dopplerReactivity =
    (core.fuelTemperature - PHYSICS.FUEL_TEMP_NOMINAL) * PHYSICS.DOPPLER_COEFFICIENT;
  const coolantDensityReactivity =
    (core.coolantTemperature - PHYSICS.COOLANT_TEMP_NOMINAL) * PHYSICS.COOLANT_DENSITY_COEFFICIENT;
  const graphiteTipReactivity = calculateAz5GraphiteTipReactivity(state, state.az5Timer);

  return (
    PHYSICS.BASE_EXCESS_REACTIVITY +
    rodReactivity +
    voidReactivity +
    xenonReactivity +
    dopplerReactivity +
    coolantDensityReactivity +
    graphiteTipReactivity
  );
}

function calculateCoolantTarget(powerMW: number, effectiveCooling: number): number {
  return (
    PHYSICS.COOLANT_TEMP_NOMINAL +
    ((powerMW / PHYSICS.MAX_THERMAL_POWER) * PHYSICS.COOLANT_HEATUP_RANGE) / effectiveCooling
  );
}

function calculateThermalTargets(
  powerMW: number,
  effectiveCooling: number,
  coolantTemperature: number
): Pick<CoreDynamicsState, "fuelTemperature" | "fuelSurfaceTemperature" | "claddingTemperature"> {
  const normalizedPower = powerMW / PHYSICS.NOMINAL_POWER;
  const claddingTemperature =
    coolantTemperature + (normalizedPower * PHYSICS.CLADDING_RISE) / effectiveCooling;
  const fuelSurfaceTemperature =
    claddingTemperature + (normalizedPower * PHYSICS.FUEL_SURFACE_RISE) / effectiveCooling;
  const fuelTemperature =
    fuelSurfaceTemperature + (normalizedPower * PHYSICS.FUEL_CENTER_RISE) / effectiveCooling;

  return {
    fuelTemperature,
    fuelSurfaceTemperature,
    claddingTemperature,
  };
}

function calculateEffectiveCooling(
  activeCoolantPumps: number,
  eccsEnabled: boolean,
  coolantTemperature: number
): number {
  let coolingCapacity =
    (activeCoolantPumps * PHYSICS.COOLANT_FLOW_PER_PUMP) / PHYSICS.COOLANT_FLOW_NOMINAL;
  const subcoolingMargin = PHYSICS.COOLANT_TEMP_BOILING - coolantTemperature;

  if (subcoolingMargin < PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD && activeCoolantPumps >= 6) {
    const cavitationSeverity = clamp01(
      1 - subcoolingMargin / PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD
    );
    coolingCapacity *=
      PHYSICS.CAVITATION_FLOW_PENALTY +
      (1 - PHYSICS.CAVITATION_FLOW_PENALTY) * (1 - cavitationSeverity);
  }

  if (eccsEnabled) {
    coolingCapacity *= 1.3;
  }

  return Math.max(0.01, coolingCapacity);
}

function calculateVoidTarget(
  coolantTarget: number,
  saturationTemperature: number,
  powerMW: number,
  priorVoid: number
): number {
  const equilibriumVoid =
    coolantTarget > saturationTemperature
      ? clamp01((coolantTarget - saturationTemperature) / PHYSICS.VOID_FORMATION_RANGE)
      : 0;
  const promptBoiling =
    powerMW > PHYSICS.NOMINAL_POWER
      ? clamp01((powerMW - PHYSICS.NOMINAL_POWER) / (PHYSICS.PEAK_EXCURSION_POWER - PHYSICS.NOMINAL_POWER))
      : 0;

  return Math.max(equilibriumVoid, promptBoiling * 0.85, priorVoid * 0.35);
}

function calculateSteamPressure(
  thermalPower: number,
  steamVoidFraction: number,
  effectiveCooling: number
): number {
  return Math.max(
    0,
    PHYSICS.STEAM_PRESSURE_NOMINAL +
      steamVoidFraction * PHYSICS.PRESSURE_VOID_GAIN +
      (thermalPower / PHYSICS.MAX_THERMAL_POWER) * PHYSICS.PRESSURE_POWER_GAIN -
      effectiveCooling * PHYSICS.PRESSURE_COOLING_GAIN
  );
}

function calculateSaturationTemperature(steamPressure: number): number {
  return (
    PHYSICS.SATURATION_TEMPERATURE_OFFSET +
    steamPressure * PHYSICS.SATURATION_TEMPERATURE_SLOPE
  );
}

function calculateCoreTemperatureZones(
  controlRods: number,
  fuelTemperature: number,
  fuelSurfaceTemperature: number,
  steamVoidFraction: number,
  xenonConcentration: number
): [number, number, number, number] {
  const rodFraction = controlRods / PHYSICS.MAX_CONTROL_RODS;
  const baseTemperature = fuelTemperature * 0.75 + fuelSurfaceTemperature * 0.25;
  const rodCoolingEffect = rodFraction * 0.15;
  const xenonHeatEffect = xenonConcentration * 0.08;
  const voidHeatEffect = steamVoidFraction * 0.12;

  return [
    baseTemperature * (1.0 - rodCoolingEffect * 0.8 + voidHeatEffect * 1.1),
    baseTemperature * (1.0 + 0.06 - rodCoolingEffect + xenonHeatEffect * 0.5),
    baseTemperature * (1.0 - 0.04 - rodCoolingEffect * 0.9 - xenonHeatEffect),
    baseTemperature * (1.0 + 0.03 + voidHeatEffect - rodCoolingEffect * 1.1),
  ];
}

function normalizeDelayedNeutronPrecursors(
  groups: DelayedGroups,
  neutronFlux: number
): DelayedGroups {
  if (groups.every(value => Number.isFinite(value) && value >= 0)) {
    return [...groups] as DelayedGroups;
  }

  return createEquilibriumDelayedNeutronPrecursors(neutronFlux);
}

function hasRecentEvent(events: GameEvent[], message: string): boolean {
  return events.some(e => e.message === message);
}

function addEventIfNew(events: GameEvent[], timestamp: number, message: string, severity: GameEvent['severity']): void {
  if (!hasRecentEvent(events, message)) {
    events.push({ timestamp, message, severity });
  }
}
