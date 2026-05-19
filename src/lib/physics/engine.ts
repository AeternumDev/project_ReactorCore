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

  // 1) Pumpendynamik (ГЦН‑317 Schwungrad-Auslauf / Anlauf, Reservebus an TG-8).
  //    activeCoolantPumps und coolantFlowRate werden hieraus geführt, damit die Physik
  //    den tätlichen Auslauf vom 26.04.1986 (~45 s Reserve) nachbilden kann.
  const pumpUpdate = updatePumpDynamics(state);
  const liveActivePumps = pumpUpdate.activeCoolantPumps;

  let manualRods = state.manualRods;
  let autoRods = state.autoRods;
  let shortenedRods = state.shortenedRods;
  const safetyRods = state.safetyRods;

  ({ manualRods, autoRods } = applyPowerAutopilot(state, manualRods, autoRods, shortenedRods, safetyRods));

  const controlRods = manualRods + autoRods + shortenedRods + safetyRods;
  const reactivityMargin = controlRods;

  const core = integrateCoreDynamics({ ...state, activeCoolantPumps: liveActivePumps }, {
    controlRods,
    reactivityMargin,
  });

  const neutronFlux = clamp(core.neutronFlux, MIN_NEUTRON_FLUX, FLUX_CAP);
  const thermalPower = clamp(
    neutronFlux * PHYSICS.NOMINAL_POWER,
    PHYSICS.DECAY_HEAT_FLOOR,
    PHYSICS.PEAK_EXCURSION_POWER
  );
  const coolantFlowRate = pumpUpdate.coolantFlowRate;
  const effectiveCooling = calculateEffectiveCooling(
    liveActivePumps,
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

  const turbineConnected = state.turbineConnected;
  let turbineValveOpen = state.turbineValveOpen;
  if (state.turbineAuto) {
    turbineValveOpen = calculateAutoTurbineValve(state, steamPressure);
  }

  let turbineSpeed = state.turbineSpeed;
  let generatorOutput = state.generatorOutput;

  if (turbineConnected && turbineValveOpen > 0) {
    const steamDrive =
      (steamPressure / PHYSICS.STEAM_PRESSURE_NOMINAL) *
      (turbineValveOpen / 100) *
      PHYSICS.TURBINE_NOMINAL_SPEED;
    turbineSpeed += (steamDrive - turbineSpeed) * 0.05 * DT;
  } else {
    turbineSpeed = Math.max(0, turbineSpeed - PHYSICS.TURBINE_SPINDOWN_RATE * DT);
  }
  turbineSpeed = Math.max(0, Math.min(PHYSICS.TURBINE_MAX_SPEED, turbineSpeed));

  if (turbineConnected && turbineSpeed > 500) {
    generatorOutput =
      thermalPower *
      PHYSICS.TURBINE_EFFICIENCY *
      (turbineSpeed / PHYSICS.TURBINE_NOMINAL_SPEED) *
      (turbineValveOpen / 100);
  } else {
    generatorOutput = Math.max(0, generatorOutput - 20 * DT);
  }
  generatorOutput = Math.max(0, generatorOutput);

  let drumSeparatorLevel = state.drumSeparatorLevel;
  const feedWaterFlow = state.feedWaterAuto
    ? calculateAutoFeedWaterFlow(state, thermalPower, core.steamVoidFraction)
    : state.feedWaterFlow;
  const steamOutRate = calculateDrumSteamOutRate(thermalPower, core.steamVoidFraction);
  const waterInRate = feedWaterFlow / PHYSICS.FEED_WATER_NOMINAL;
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
      addEventIfNew(
        events,
        elapsed,
        `BAZ AUSGELÖST — Wärmeleistung ${Math.round(thermalPower)} MW, Druck ${steamPressure.toFixed(1)} bar, Durchfluss ${Math.round(coolantFlowRate)} m³/h`,
        "critical",
        "baz-triggered",
      );
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
    addEventIfNew(
      events,
      elapsed,
      `KERNSCHMELZE — Brennstofftemperatur ${Math.round(core.fuelTemperature)} °C, Reaktor 4 zerstört`,
      "alarm",
      "meltdown",
    );
  }

  if (steamPressure >= PHYSICS.STEAM_PRESSURE_CRITICAL) {
    isExploded = true;
    addEventIfNew(
      events,
      elapsed,
      `DRUCKROHRVERSAGEN — Dampfdruck ${steamPressure.toFixed(1)} bar, Dampfexplosion`,
      "alarm",
      "pressure-explosion",
    );
  }

  if (elapsed >= PHYSICS.TEST_DURATION_SECONDS && !isExploded) {
    testCompleted = true;
  }

  const subcoolingMargin = PHYSICS.COOLANT_TEMP_BOILING - core.coolantTemperature;
  // Kavitation hängt von NPSH ab — nicht von der Pumpenanzahl. Trigger sobald
  // überhaupt nennenswerter Durchfluss vorhanden ist und die Unterkühlung schwindet.
  if (subcoolingMargin < PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD && liveActivePumps >= 1) {
    const cavitationSeverity = clamp01(
      1 - subcoolingMargin / PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD
    );
    if (cavitationSeverity > 0.5) {
      addEventIfNew(
        events,
        elapsed,
        `KAVITATION IN KÜHLMITTELPUMPEN — Unterkühlung nur ${subcoolingMargin.toFixed(1)} °C`,
        "warning",
        "cavitation",
      );
    }
  }

  const finalControlRods = Math.round(manualRods + autoRods + shortenedRods + newSafetyRods);

  if (finalControlRods < PHYSICS.MINIMUM_SAFE_RODS) {
    addEventIfNew(
      events,
      elapsed,
      `MINIMALE STABABSENKUNG UNTERSCHRITTEN — nur ${finalControlRods} Stäbe gegenüber ${PHYSICS.MINIMUM_SAFE_RODS} erforderlich`,
      "alarm",
      "min-rods",
    );
  }

  if (core.fuelTemperature > PHYSICS.FUEL_TEMP_WARNING) {
    addEventIfNew(
      events,
      elapsed,
      `BRENNSTOFFTEMPERATUR KRITISCH — ${Math.round(core.fuelTemperature)} °C (Grenzwert ${PHYSICS.FUEL_TEMP_WARNING} °C)`,
      "critical",
      "fuel-temp",
    );
  }

  // Gleichgewichts-Xenon ist normalisiert 1.0; ein Pit zeichnet sich erst ab
  // Xe ≳ 1.5 ab (≈50 % über Sollwert) — das ist die historisch relevante Falle.
  if (
    core.xenonConcentration > PHYSICS.XENON_WARNING_CONCENTRATION &&
    state.xenonConcentration <= PHYSICS.XENON_WARNING_CONCENTRATION
  ) {
    addEventIfNew(
      events,
      elapsed,
      `XENON-PIT ENTWICKELT — Konzentration ${(core.xenonConcentration * 100).toFixed(0)} % des Gleichgewichts, Reaktivitätsreserve schwindet`,
      "warning",
      "xenon",
    );
  }

  if (steamPressure > PHYSICS.STEAM_PRESSURE_WARNING && state.steamPressure <= PHYSICS.STEAM_PRESSURE_WARNING) {
    addEventIfNew(
      events,
      elapsed,
      `DAMPFDRUCK ERHÖHT — ${steamPressure.toFixed(1)} bar (Warngrenze ${PHYSICS.STEAM_PRESSURE_WARNING} bar)`,
      "warning",
      "steam-pressure",
    );
  }

  if (core.steamVoidFraction > 0.3 && state.steamVoidFraction <= 0.3) {
    addEventIfNew(
      events,
      elapsed,
      `DAMPFBLASENANTEIL KRITISCH — ${(core.steamVoidFraction * 100).toFixed(0)} % Hohlraumanteil`,
      "warning",
      "void",
    );
  }

  if (Math.min(state.thermalPower, thermalPower) <= PHYSICS.XENON_STALL_POWER && !state.az5Active) {
    addEventIfNew(
      events,
      elapsed,
      `REAKTOR GESTALLT — Wärmeleistung ${Math.round(thermalPower)} MW, Betriebsvorschrift erwartet AZ-5`,
      "critical",
      "reactor-stalled-az5",
    );
  }

  if (finalControlRods < PHYSICS.OZR_WARNING) {
    addEventIfNew(
      events,
      elapsed,
      `OZR UNTER WARNGRENZE — ${finalControlRods} Stäbe (Warngrenze ${PHYSICS.OZR_WARNING})`,
      "warning",
      "ozr-warning",
    );
  }

  if (finalControlRods < PHYSICS.OZR_MINIMUM_SAFE) {
    addEventIfNew(
      events,
      elapsed,
      `OZR KRITISCH NIEDRIG — ${finalControlRods} Stäbe, Vorschrift verlangt sofortige Abschaltung`,
      "alarm",
      "ozr-critical",
    );
  }

  if (drumSeparatorLevel < PHYSICS.DRUM_LEVEL_LOW) {
    addEventIfNew(
      events,
      elapsed,
      `TROMMELABSCHEIDER WASSERSTAND NIEDRIG — ${drumSeparatorLevel.toFixed(0)} % (Grenzwert ${PHYSICS.DRUM_LEVEL_LOW} %)`,
      "warning",
      "drum-level",
    );
  }

  if (turbineSpeed > PHYSICS.TURBINE_MAX_SPEED * 0.95) {
    addEventIfNew(
      events,
      elapsed,
      `TURBINE ÜBERDREHZAHL — ${Math.round(turbineSpeed)} U/min (Grenzwert ${Math.round(PHYSICS.TURBINE_MAX_SPEED)} U/min)`,
      "critical",
      "turbine-overspeed",
    );
  }

  if (!bazArmed) {
    addEventIfNew(
      events,
      elapsed,
      `BAZ DEAKTIVIERT — Schutzabschaltung blockiert, Wärmeleistung ${Math.round(thermalPower)} MW`,
      "warning",
      "baz-disabled",
    );
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
    turbineConnected,
    turbineValveOpen,
    generatorOutput,
    drumSeparatorLevel,
    feedWaterFlow,
    bazTriggered,
    bazArmed,
    activeCoolantPumps: liveActivePumps,
    pumpSpeeds: pumpUpdate.pumpSpeeds,
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
    message: `AZ-5 AKTIVIERT — Notabschaltung eingeleitet, Wärmeleistung ${Math.round(state.thermalPower)} MW, OZR ${currentControlRods} Stäbe`,
    severity: 'critical',
    code: 'az5-activated',
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
    message: `BAZ MANUELL AUSGELÖST — Sicherheitsstäbe fahren ein, Wärmeleistung ${Math.round(state.thermalPower)} MW`,
    severity: 'critical',
    code: 'baz-manual',
  });

  return {
    bazTriggered: true,
    events,
  };
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

function applyPowerAutopilot(
  state: ReactorState,
  manualRods: number,
  autoRods: number,
  shortenedRods: number,
  safetyRods: number,
): Pick<ReactorState, 'manualRods' | 'autoRods'> {
  if (state.powerMode !== "auto") {
    return { manualRods, autoRods };
  }

  const powerError = state.thermalPower - state.powerSetpoint;
  const powerTrend = state.thermalPower - state.lastPowerLevel;
  const dampedError = powerError + powerTrend * 0.6;
  if (Math.abs(dampedError) < 3) {
    return { manualRods, autoRods };
  }

  const rodStep = Math.min(Math.abs(dampedError) / 90, 1.2) * DT;
  const totalRods = manualRods + autoRods + shortenedRods + safetyRods;

  if (dampedError > 0) {
    const autoHeadroom = PHYSICS.AUTO_RODS_MAX - autoRods;
    const autoInsertion = Math.min(autoHeadroom, rodStep);
    autoRods += autoInsertion;

    const remaining = rodStep - autoInsertion;
    if (remaining > 0) {
      manualRods = Math.min(PHYSICS.MANUAL_RODS_MAX, manualRods + remaining * 0.7);
    }
  } else {
    const autoWithdrawal = Math.min(autoRods, rodStep);
    autoRods -= autoWithdrawal;

    const remaining = rodStep - autoWithdrawal;
    const protectedRods = PHYSICS.OZR_MINIMUM_SAFE + 1;
    const withdrawableManualRods = Math.max(0, totalRods - protectedRods - autoWithdrawal);
    if (remaining > 0 && withdrawableManualRods > 0) {
      manualRods = Math.max(0, manualRods - Math.min(withdrawableManualRods, remaining * 0.6));
    }
  }

  return { manualRods, autoRods };
}

function calculateAutoTurbineValve(state: ReactorState, steamPressure: number): number {
  if (!state.turbineConnected) {
    const closeStep = 24 * DT;
    return clamp(state.turbineValveOpen - closeStep, 0, 100);
  }

  const speedError = PHYSICS.TURBINE_NOMINAL_SPEED - state.turbineSpeed;
  const pressureError = steamPressure - PHYSICS.STEAM_PRESSURE_NOMINAL;
  const overspeedClose = state.turbineSpeed > PHYSICS.TURBINE_NOMINAL_SPEED * 1.03;
  const targetValve = overspeedClose
    ? 0
    : clamp(68 + speedError / 45 + pressureError * 1.6, 0, 100);
  const maxValveStep = 16 * DT;
  return clamp(
    state.turbineValveOpen + clamp(targetValve - state.turbineValveOpen, -maxValveStep, maxValveStep),
    0,
    100,
  );
}

function calculateAutoFeedWaterFlow(
  state: ReactorState,
  thermalPower: number,
  steamVoidFraction: number,
): number {
  const levelError = PHYSICS.DRUM_LEVEL_NOMINAL - state.drumSeparatorLevel;
  const steamOutRate = calculateDrumSteamOutRate(thermalPower, steamVoidFraction);
  const steadyFlow = (0.5 + steamOutRate) * PHYSICS.FEED_WATER_NOMINAL;
  const targetFlow = clamp(steadyFlow + levelError * 12, 0, 1000);
  const maxFlowStep = 120 * DT;
  return clamp(
    state.feedWaterFlow + clamp(targetFlow - state.feedWaterFlow, -maxFlowStep, maxFlowStep),
    0,
    1000,
  );
}

function calculateDrumSteamOutRate(thermalPower: number, steamVoidFraction: number): number {
  const powerSteamDemand = 0.5 * clamp(thermalPower / PHYSICS.TEST_POWER_TARGET, 0, 6);
  const voidSwellDemand = steamVoidFraction * 3.2;
  return clamp(powerSteamDemand + voidSwellDemand, 0, 5.5);
}

/**
 * Aktualisiert die Drehzahl jeder ГЦН unter Berücksichtigung des Schwungrads,
 * der Befühlung (pumpStates) und des Reservebus (rundownBusActive).
 *
 * • Pumpen am Reservebus folgen bei abgeschaltetem Bus der auslaufenden TG-8-Drehzahl.
 * • Auslauf nach Stromverlust: exponentiell mit τ = PUMP_COASTDOWN_TAU (~22 s).
 * • Anlauf nach Wiedereinschaltung: τ = PUMP_SPINUP_TAU.
 * • Wenn pumpSpeeds und activeCoolantPumps stark voneinander abweichen (z. B. Test
 *   setzt activeCoolantPumps direkt), werden die Drehzahlen einmalig synchronisiert.
 */
function updatePumpDynamics(state: ReactorState): {
  pumpSpeeds: ReactorState['pumpSpeeds'];
  activeCoolantPumps: number;
  coolantFlowRate: number;
} {
  const rawSpeeds = state.pumpSpeeds ?? [1, 1, 1, 1, 1, 1, 1, 1];
  const currentSum = rawSpeeds.reduce((s, v) => s + v, 0);
  const overrideMismatch = Math.abs(currentSum - state.activeCoolantPumps) > 0.5;
  const baseSpeeds: number[] = overrideMismatch
    ? syncSpeedsToCount(state.activeCoolantPumps, state.pumpStates)
    : [...rawSpeeds];

  const turbineFraction = clamp01(state.turbineSpeed / PHYSICS.TURBINE_NOMINAL_SPEED);
  const onRundownBus = new Set<number>(PHYSICS.PUMP_RUNDOWN_BUS_INDICES);

  const nextSpeeds = baseSpeeds.map((current, i) => {
    const commandedOn = state.pumpStates[i];
    let target: number;
    if (onRundownBus.has(i) && !state.rundownBusActive) {
      // Vom Netz getrennt: Pumpe läuft mit der auslaufenden Turbine mit.
      target = commandedOn ? turbineFraction : 0;
    } else {
      target = commandedOn ? 1 : 0;
    }
    const tau = target > current ? PHYSICS.PUMP_SPINUP_TAU : PHYSICS.PUMP_COASTDOWN_TAU;
    const next = current + (target - current) * (DT / tau);
    return clamp01(next);
  }) as unknown as ReactorState['pumpSpeeds'];

  const activeCoolantPumps = nextSpeeds.reduce((s, v) => s + v, 0);
  const coolantFlowRate = activeCoolantPumps * PHYSICS.COOLANT_FLOW_PER_PUMP;
  return { pumpSpeeds: nextSpeeds, activeCoolantPumps, coolantFlowRate };
}

function syncSpeedsToCount(
  activeCount: number,
  pumpStates: ReactorState['pumpStates']
): number[] {
  // Verteile activeCount auf die als ON markierten Pumpen; Rest 0.
  const onIndices: number[] = [];
  pumpStates.forEach((on, i) => { if (on) onIndices.push(i); });
  const result = [0, 0, 0, 0, 0, 0, 0, 0];
  if (onIndices.length === 0) return result;
  const perPump = clamp01(activeCount / onIndices.length);
  onIndices.forEach((i) => { result[i] = perPump; });
  return result;
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
    xenonConcentration: clamp(state.xenonConcentration, 0, PHYSICS.XENON_PIT_CAP),
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
      effectiveCooling,
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
        PHYSICS.XENON_IODINE_YIELD_COEFFICIENT * core.iodineConcentration -
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
    core.xenonConcentration = clamp(core.xenonConcentration + xenonDot * subDt, 0, PHYSICS.XENON_PIT_CAP);
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

  if (subcoolingMargin < PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD && activeCoolantPumps >= 1) {
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

  return Math.max(PHYSICS.EFFECTIVE_COOLING_FLOOR, coolingCapacity);
}

function calculateVoidTarget(
  coolantTarget: number,
  saturationTemperature: number,
  powerMW: number,
  effectiveCooling: number,
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

  // Reduzierter Kühlmitteldurchfluss erzeugt unmittelbar Kanal-Austritts-Sieden,
  // unabhängig von der Bulk-Mitteltemperatur. Das schließt die Lücke zwischen
  // gemittelter Kühlmitteltemperatur und realer Zwei-Phasen-Strömung im RBMK-Kanal
  // und stellt sicher, dass ein Pumpenausfall die positive Void-Rückkopplung anregt.
  const coolingDeficit = clamp01(1 - effectiveCooling);
  const flowInducedVoid = clamp01(
    (powerMW / PHYSICS.NOMINAL_POWER) * coolingDeficit * PHYSICS.FLOW_INDUCED_VOID_GAIN
  );

  // Void inertia is handled by VOID_TIME_CONSTANT in the integration step;
  // do not introduce an additional implicit floor here.
  void priorVoid;
  return Math.max(equilibriumVoid, promptBoiling * 0.85, flowInducedVoid);
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

const EVENT_REPEAT_WINDOW_SECONDS = 90;

function hasRecentEvent(events: GameEvent[], code: string, now: number): boolean {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (now - event.timestamp > EVENT_REPEAT_WINDOW_SECONDS) {
      return false;
    }
    if ((event.code ?? event.message) === code) {
      return true;
    }
  }
  return false;
}

function addEventIfNew(
  events: GameEvent[],
  timestamp: number,
  message: string,
  severity: GameEvent['severity'],
  code?: string,
): void {
  const dedupKey = code ?? message;
  if (!hasRecentEvent(events, dedupKey, timestamp)) {
    events.push({ timestamp, message, severity, code: dedupKey });
  }
}
