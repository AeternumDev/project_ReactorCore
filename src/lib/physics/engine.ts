import { ReactorState, GameEvent } from "./types";
import { PHYSICS } from "./constants";

const DT = PHYSICS.TICK_INTERVAL_MS / 1000; // 0.5s per tick

/**
 * Berechnet den nächsten Reaktorzustand (pure Funktion, aufgerufen bei jedem TICK).
 */
export function calculateNextState(state: ReactorState): Partial<ReactorState> {
  const events: GameEvent[] = [...state.events];
  const elapsed = state.elapsedSeconds + DT;

  // --- Stabgruppen synchronisieren ---
  let manualRods = state.manualRods;
  let autoRods = state.autoRods;
  let shortenedRods = state.shortenedRods;
  const safetyRods = state.safetyRods;

  // Auto-Regelung: AR-Stäbe passen sich automatisch an
  if (state.powerMode === 'auto') {
    const powerError = state.thermalPower - state.powerSetpoint;
    // Wenn Leistung zu hoch, mehr Stäbe einfahren; zu niedrig, ausfahren
    const adjustment = Math.sign(powerError) * Math.min(Math.abs(powerError) / 500, 0.5) * DT;
    autoRods = Math.max(0, Math.min(PHYSICS.AUTO_RODS_MAX, autoRods + adjustment));
  }

  const controlRods = Math.round(manualRods + autoRods + shortenedRods + safetyRods);

  // --- OZR (Operativer Reaktivitätsvorrat) berechnen ---
  const reactivityMargin = controlRods;

  // --- 3a. Reaktivität und Neutronenfluss ---
  const rodFraction = controlRods / PHYSICS.MAX_CONTROL_RODS; // 0..1, 1 = alle eingefahren
  const rodReactivity = 1 - rodFraction; // mehr Stäbe = weniger Reaktivität

  const xenonPenalty = state.xenonConcentration * PHYSICS.XENON_MAX_REACTIVITY_PENALTY;

  // Positiver Dampfblasenkoeffizient: Dampfblasen ERHÖHEN Reaktivität (RBMK-Fehler)
  // Verstärkung bei niedriger Leistung (< 700 MWth) — historischer RBMK-Designfehler
  const lowPowerFactor = Math.max(1, PHYSICS.LOW_POWER_VOID_AMPLIFICATION -
    (PHYSICS.LOW_POWER_VOID_AMPLIFICATION - 1) * (state.thermalPower / PHYSICS.TEST_POWER_TARGET));
  const voidBoost = state.steamVoidFraction * PHYSICS.VOID_COEFFICIENT * 100 * lowPowerFactor;

  // Niedrigleistungs-Mindestfluss: Thermische Trägheit verhindert sofortiges Absinken auf 0
  const thermalFloor = 0.005; // ~16 MW Restwärme

  const reactivity = Math.max(thermalFloor, Math.min(1, rodReactivity - xenonPenalty + voidBoost));

  // Neutronenfluss folgt Reaktivität mit Trägheit (exponentiell)
  // Langsamere Trägheit bei niedrigem Fluss = mehr Zeit zum Reagieren
  const fluxInertia = state.neutronFlux < 0.1 ? 0.06 : 0.1;
  let neutronFlux = state.neutronFlux + (reactivity - state.neutronFlux) * fluxInertia;

  // AZ-5 Graphit-Spitzen-Effekt ("Point of No Return" — 5 Sekunden)
  let az5Active = state.az5Active;
  let az5Timer = state.az5Timer;
  let az5PrePower = state.az5PrePower;

  if (az5Active && az5Timer > 0) {
    const spikeFactor = calculateAz5GraphiteSpikeFactor(state, az5Timer);
    if (spikeFactor > 1) {
      neutronFlux = neutronFlux * spikeFactor;
    }

    // Nach Graphit-Phase: Absorberstaebe beginnen zu wirken (ueber controlRods)
    az5Timer -= DT;
    if (az5Timer <= 0) {
      az5Active = false;
      az5Timer = 0;
    }
  } else if (az5Active && az5Timer <= 0) {
    // Vollstaendig eingefahren: starke Daempfung
    neutronFlux = neutronFlux * 0.5;
    if (neutronFlux < 0.005) {
      neutronFlux = 0.005; // Restwaerme-Boden
      az5Active = false;
    }
  }

  // Flux-Obergrenze erlaubt Leistungsexkursion bis 33.000 MWth (Referenz: >33.000 MWth)
  const fluxCap = PHYSICS.PEAK_EXCURSION_POWER / PHYSICS.MAX_THERMAL_POWER;
  neutronFlux = Math.max(0, Math.min(fluxCap, neutronFlux));

  // --- 3b. Thermische Leistung ---
  const powerInertia = 0.15;
  const targetPowerFromFlux = neutronFlux * PHYSICS.MAX_THERMAL_POWER;
  let thermalPower = state.thermalPower + (targetPowerFromFlux - state.thermalPower) * powerInertia;

  // Xenon-Stall: bei schwerer Vergiftung (>0.7) sackt Leistung Richtung 30 MW ab
  if (state.xenonConcentration > 0.7) {
    const stallPull = (state.xenonConcentration - 0.7) / 0.3; // 0→1 über [0.7, 1.0]
    thermalPower = thermalPower + (PHYSICS.XENON_STALL_POWER - thermalPower) * stallPull * 0.05;
  }

  thermalPower = Math.max(0, thermalPower);

  // --- 3c. Xenon-Dynamik — 700 MW Schwelle ---
  let xenonConcentration = state.xenonConcentration;
  const powerFraction = thermalPower / PHYSICS.NOMINAL_POWER;
  const targetFraction = PHYSICS.TEST_POWER_TARGET / PHYSICS.NOMINAL_POWER; // 0.21875

  if (powerFraction < targetFraction) {
    // Unter 700 MW: Xenon-135 baut sich aggressiv auf → Vergiftung → Abwürgen auf 30 MW
    const delayFactor = elapsed > PHYSICS.XENON_BUILD_DELAY ? 1.0 : 0.3;
    // Je tiefer unter 700 MW, desto schneller der Xenon-Aufbau
    const depthFactor = 1.0 + (targetFraction - powerFraction) / targetFraction;
    xenonConcentration += PHYSICS.XENON_BUILD_RATE * DT * delayFactor * depthFactor;
  } else if (powerFraction < PHYSICS.TEST_POWER_MAX / PHYSICS.NOMINAL_POWER) {
    // 700–1000 MW (Golden Zone): langsamer Xenon-Abbau (Gleichgewicht)
    xenonConcentration -= PHYSICS.XENON_DECAY_RATE * 0.3 * DT;
  } else if (powerFraction < 0.5) {
    // 1000–1600 MW: moderater Xenon-Abbau
    xenonConcentration -= PHYSICS.XENON_DECAY_RATE * 0.6 * DT;
  } else {
    // Über 1600 MW: Xenon wird schnell abgebrannt
    xenonConcentration -= PHYSICS.XENON_DECAY_RATE * DT;
  }
  xenonConcentration = Math.max(0, Math.min(1, xenonConcentration));

  // --- 3d. Kühlmittel und Temperaturen ---
  const coolantFlowRate = state.activeCoolantPumps * PHYSICS.COOLANT_FLOW_PER_PUMP;
  let coolingCapacity = coolantFlowRate / PHYSICS.COOLANT_FLOW_NOMINAL; // 0..~1.14

  // Kavitation: bei minimaler Unterkühlung und hohem Pumpenstrom (Referenz: 8 Pumpen, 2°C Marge)
  const subcoolingMargin = PHYSICS.COOLANT_TEMP_BOILING - state.coolantTemperature;
  if (subcoolingMargin < PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD && state.activeCoolantPumps >= 6) {
    const cavitationSeverity = Math.max(0, Math.min(1, 1 - subcoolingMargin / PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD));
    coolingCapacity *= PHYSICS.CAVITATION_FLOW_PENALTY +
      (1 - PHYSICS.CAVITATION_FLOW_PENALTY) * (1 - cavitationSeverity);
    if (cavitationSeverity > 0.5 && !hasRecentEvent(events, "KAVITATION IN KÜHLMITTELPUMPEN")) {
      addEventIfNew(events, elapsed, "KAVITATION IN KÜHLMITTELPUMPEN", 'warning');
    }
  }

  // ECCS-Effekt: Notkühlsystem reduziert Temperaturen
  const eccsFactor = state.eccsEnabled ? 1.3 : 1.0;
  const effectiveCooling = Math.max(0.01, coolingCapacity * eccsFactor); // nie 0 um Div/0 zu vermeiden

  // Normalisierte Wärmeerzeugung
  const heatGenerated = thermalPower / PHYSICS.MAX_THERMAL_POWER; // normalisiert 0..1

  // Brennstofftemperatur — equilibrium model
  // At steady-state the fuel temperature settles to a value determined by
  // heat generation vs. cooling capacity. We model this as an exponential
  // approach toward an equilibrium temperature rather than integrating a
  // raw heat delta, which prevents the temperature from collapsing to
  // coolant temp at moderate power levels.
  const equilibriumFuelTemp = PHYSICS.COOLANT_TEMP_NOMINAL +
    (PHYSICS.FUEL_TEMP_MELTDOWN - PHYSICS.COOLANT_TEMP_NOMINAL) *
    (heatGenerated / Math.max(0.01, effectiveCooling));
  const fuelTempInertia = 0.03; // slow thermal response (~15s time constant)
  let fuelTemperature = state.fuelTemperature +
    (equilibriumFuelTemp - state.fuelTemperature) * fuelTempInertia;
  fuelTemperature = Math.max(PHYSICS.COOLANT_TEMP_NOMINAL, fuelTemperature);

  // Kühlmitteltemperatur
  let coolantTemperature = PHYSICS.COOLANT_TEMP_NOMINAL +
    (thermalPower / PHYSICS.MAX_THERMAL_POWER) * 30 / Math.max(0.01, effectiveCooling);
  coolantTemperature = Math.max(PHYSICS.COOLANT_TEMP_NOMINAL, coolantTemperature);

  // Dampfblasenanteil (Void Fraction)
  let steamVoidFraction = 0;
  if (coolantTemperature > PHYSICS.COOLANT_TEMP_BOILING) {
    steamVoidFraction = Math.min(1,
      (coolantTemperature - PHYSICS.COOLANT_TEMP_BOILING) / PHYSICS.VOID_FORMATION_RANGE
    );
  }

  // Dampfdruck
  let steamPressure = PHYSICS.STEAM_PRESSURE_NOMINAL +
    steamVoidFraction * 40 +
    (thermalPower / PHYSICS.MAX_THERMAL_POWER) * 20 -
    effectiveCooling * 15;
  steamPressure = Math.max(0, steamPressure);

  // Kerntemperaturzonen — per-quadrant physics
  // Each quadrant has slightly different rod density and xenon distribution,
  // creating realistic asymmetric temperature fields.
  // NW(0) and SE(3) tend hotter (fewer rods in simplified model),
  // NE(1) and SW(2) slightly cooler.
  const rodCoolingEffect = rodFraction * 0.15; // more rods → more local absorption → cooler
  const xenonHeatEffect = xenonConcentration * 0.08; // xenon absorbs neutrons → local heating reduction
  const voidHeatEffect = steamVoidFraction * 0.12; // voids reduce moderation → uneven heating

  const zoneFactors: [number, number, number, number] = [
    1.0 - rodCoolingEffect * 0.8 + voidHeatEffect * 1.1,   // NW: moderate
    1.0 + 0.06 - rodCoolingEffect + xenonHeatEffect * 0.5,  // NE: slightly hotter
    1.0 - 0.04 - rodCoolingEffect * 0.9 - xenonHeatEffect,  // SW: slightly cooler
    1.0 + 0.03 + voidHeatEffect - rodCoolingEffect * 1.1,   // SE: moderate-hot
  ];

  const coreTemperatureZones: [number, number, number, number] = [
    fuelTemperature * zoneFactors[0],
    fuelTemperature * zoneFactors[1],
    fuelTemperature * zoneFactors[2],
    fuelTemperature * zoneFactors[3],
  ];

  // --- 3e. Turbine und Generator ---
  let turbineSpeed = state.turbineSpeed;
  let generatorOutput = state.generatorOutput;
  const turbineValveOpen = state.turbineValveOpen;
  const turbineConnected = state.turbineConnected;

  if (turbineConnected && turbineValveOpen > 0) {
    // Dampf treibt Turbine an
    const steamDrive = (steamPressure / PHYSICS.STEAM_PRESSURE_NOMINAL) *
      (turbineValveOpen / 100) * PHYSICS.TURBINE_NOMINAL_SPEED;
    turbineSpeed += (steamDrive - turbineSpeed) * 0.05 * DT;
  } else {
    // Turbine läuft aus
    turbineSpeed = Math.max(0, turbineSpeed - PHYSICS.TURBINE_SPINDOWN_RATE * DT);
  }
  turbineSpeed = Math.max(0, Math.min(PHYSICS.TURBINE_MAX_SPEED, turbineSpeed));

  // Generatorleistung
  if (turbineConnected && turbineSpeed > 500) {
    generatorOutput = thermalPower * PHYSICS.TURBINE_EFFICIENCY *
      (turbineSpeed / PHYSICS.TURBINE_NOMINAL_SPEED) *
      (turbineValveOpen / 100);
  } else {
    generatorOutput = Math.max(0, generatorOutput - 20 * DT);
  }
  generatorOutput = Math.max(0, generatorOutput);

  // --- 3f. Trommelabscheider ---
  let drumSeparatorLevel = state.drumSeparatorLevel;
  const feedWaterFlow = state.feedWaterFlow;

  // Wasser geht rein (Speisewasser), Dampf geht raus
  const steamOutRate = steamVoidFraction * 5; // Dampfabgang
  const waterInRate = feedWaterFlow / PHYSICS.FEED_WATER_NOMINAL; // normalisiert
  drumSeparatorLevel += (waterInRate - steamOutRate - 0.5) * DT * 2;
  drumSeparatorLevel = Math.max(0, Math.min(100, drumSeparatorLevel));

  // --- 3g. BAZ — Automatische Notabschaltung ---
  let bazTriggered = state.bazTriggered;
  let bazArmed = state.bazArmed;

  if (bazArmed && !bazTriggered && !state.az5Active) {
    const bazPowerLimit = state.powerSetpoint * PHYSICS.BAZ_POWER_THRESHOLD;
    if (
      thermalPower > bazPowerLimit ||
      steamPressure > PHYSICS.BAZ_PRESSURE_THRESHOLD ||
      coolantFlowRate < PHYSICS.BAZ_COOLANT_FLOW_MIN
    ) {
      bazTriggered = true;
      events.push({
        timestamp: elapsed,
        message: "BAZ AUSGELÖST — SCHNELLE NOTABSCHALTUNG",
        severity: 'critical',
      });
    }
  }

  // BAZ-Effekt: Sicherheitsstäbe einfahren (kein Graphit-Spike!)
  let newSafetyRods = safetyRods;
  if (bazTriggered) {
    newSafetyRods = Math.min(PHYSICS.SAFETY_RODS_MAX, safetyRods + 20 * DT);
  }

  // AZ-5 graduelle Stabeinfahrt (0,4 m/s, ~18 Sekunden für vollständiges Einfahren)
  if (az5Active) {
    const rodsPerTick = PHYSICS.AZ5_ROD_INSERTION_RATE * DT;
    newSafetyRods = Math.min(PHYSICS.SAFETY_RODS_MAX, newSafetyRods + rodsPerTick);
    manualRods = Math.min(PHYSICS.MANUAL_RODS_MAX, manualRods + rodsPerTick);
    autoRods = Math.min(PHYSICS.AUTO_RODS_MAX, autoRods + rodsPerTick);
    shortenedRods = Math.min(PHYSICS.SHORTENED_RODS_MAX, shortenedRods + rodsPerTick);
  }

  // --- 3h. Spielende-Bedingungen ---
  let isExploded = state.isExploded;
  let testCompleted = state.testCompleted;

  if (fuelTemperature >= PHYSICS.FUEL_TEMP_MELTDOWN) {
    isExploded = true;
    addEventIfNew(events, elapsed, "KERNSCHMELZE — REAKTOR 4 EXPLODIERT", 'alarm');
  }

  if (steamPressure >= PHYSICS.STEAM_PRESSURE_CRITICAL) {
    isExploded = true;
    addEventIfNew(events, elapsed, "DRUCKROHRVERSAGEN — DAMPFEXPLOSION", 'alarm');
  }

  if (elapsed >= PHYSICS.TEST_DURATION_SECONDS && !isExploded) {
    testCompleted = true;
  }

  // --- 3i. Ereignis-Generierung ---
  if (controlRods < PHYSICS.MINIMUM_SAFE_RODS && !hasRecentEvent(events, "MINIMALE STABABSENKUNG UNTERSCHRITTEN")) {
    addEventIfNew(events, elapsed, "MINIMALE STABABSENKUNG UNTERSCHRITTEN", 'alarm');
  }

  if (fuelTemperature > PHYSICS.FUEL_TEMP_WARNING && !hasRecentEvent(events, "BRENNSTOFFTEMPERATUR KRITISCH")) {
    addEventIfNew(events, elapsed, "BRENNSTOFFTEMPERATUR KRITISCH", 'critical');
  }

  if (xenonConcentration > 0.5 && state.xenonConcentration <= 0.5) {
    events.push({ timestamp: elapsed, message: "XENON-VERGIFTUNG ERHÖHT", severity: 'warning' });
  }

  if (steamPressure > PHYSICS.STEAM_PRESSURE_WARNING && state.steamPressure <= PHYSICS.STEAM_PRESSURE_WARNING) {
    events.push({ timestamp: elapsed, message: "DAMPFDRUCK ERHÖHT", severity: 'warning' });
  }

  if (steamVoidFraction > 0.3 && state.steamVoidFraction <= 0.3) {
    events.push({ timestamp: elapsed, message: "DAMPFBLASENANTEIL KRITISCH", severity: 'warning' });
  }

  if (reactivityMargin < PHYSICS.OZR_WARNING && !hasRecentEvent(events, "OZR UNTER WARNGRENZE")) {
    addEventIfNew(events, elapsed, "OZR UNTER WARNGRENZE", 'warning');
  }

  if (reactivityMargin < PHYSICS.OZR_MINIMUM_SAFE && !hasRecentEvent(events, "OZR KRITISCH NIEDRIG")) {
    addEventIfNew(events, elapsed, "OZR KRITISCH NIEDRIG", 'alarm');
  }

  if (drumSeparatorLevel < PHYSICS.DRUM_LEVEL_LOW && !hasRecentEvent(events, "TROMMELABSCHEIDER WASSERSTAND NIEDRIG")) {
    addEventIfNew(events, elapsed, "TROMMELABSCHEIDER WASSERSTAND NIEDRIG", 'warning');
  }

  if (turbineSpeed > PHYSICS.TURBINE_MAX_SPEED * 0.95 && !hasRecentEvent(events, "TURBINE ÜBERDREHZAHL")) {
    addEventIfNew(events, elapsed, "TURBINE ÜBERDREHZAHL", 'critical');
  }

  if (!bazArmed && !hasRecentEvent(events, "BAZ DEAKTIVIERT — SCHUTZABSCHALTUNG BLOCKIERT")) {
    addEventIfNew(events, elapsed, "BAZ DEAKTIVIERT — SCHUTZABSCHALTUNG BLOCKIERT", 'warning');
  }

  const finalControlRods = Math.round(manualRods + autoRods + shortenedRods + newSafetyRods);

  return {
    neutronFlux,
    thermalPower,
    xenonConcentration,
    coolantTemperature,
    coolantFlowRate,
    fuelTemperature,
    steamPressure,
    steamVoidFraction,
    coreTemperatureZones,
    isExploded,
    testCompleted,
    events,
    lastPowerLevel: thermalPower,
    az5Active,
    az5Timer,
    az5PrePower,
    controlRods: finalControlRods,
    manualRods,
    autoRods,
    shortenedRods,
    safetyRods: newSafetyRods,
    reactivityMargin,
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
  const insertionElapsed = PHYSICS.AZ5_FULL_INSERTION_TIME - az5Timer;
  if (insertionElapsed >= PHYSICS.AZ5_GRAPHIT_SPIKE_DURATION) {
    return 1;
  }

  const spikePhase = 1 - insertionElapsed / PHYSICS.AZ5_GRAPHIT_SPIKE_DURATION;
  const lowPowerSeverity = clamp01(
    (PHYSICS.AZ5_GRAPHIT_POWER_THRESHOLD - state.thermalPower) /
    PHYSICS.AZ5_GRAPHIT_POWER_THRESHOLD
  );
  const lowMarginSeverity = clamp01(
    (PHYSICS.AZ5_GRAPHIT_MARGIN_THRESHOLD - state.reactivityMargin) /
    (PHYSICS.AZ5_GRAPHIT_MARGIN_THRESHOLD - PHYSICS.OZR_MINIMUM_SAFE)
  );
  const voidSeverity = clamp01(
    (state.steamVoidFraction - PHYSICS.AZ5_GRAPHIT_VOID_THRESHOLD) /
    (1 - PHYSICS.AZ5_GRAPHIT_VOID_THRESHOLD)
  );

  // Positive scram becomes relevant only when low power, low OZR and voiding
  // line up at the same time. In a healthy core, AZ-5 should shut the reactor down.
  const spikeSeverity = clamp01(lowPowerSeverity * (lowMarginSeverity * 0.6 + voidSeverity * 0.4));
  if (spikeSeverity <= 0) {
    return 1;
  }

  const peakMultiplier = state.reactivityMargin < PHYSICS.OZR_MINIMUM_SAFE
    ? PHYSICS.AZ5_LOW_ORM_MULTIPLIER
    : PHYSICS.AZ5_GRAPHIT_POWER_MULTIPLIER;

  return 1 + (peakMultiplier - 1) * spikeSeverity * spikePhase;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hasRecentEvent(events: GameEvent[], message: string): boolean {
  return events.some(e => e.message === message);
}

function addEventIfNew(events: GameEvent[], timestamp: number, message: string, severity: GameEvent['severity']): void {
  if (!hasRecentEvent(events, message)) {
    events.push({ timestamp, message, severity });
  }
}
