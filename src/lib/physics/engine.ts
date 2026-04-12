import { ReactorState, GameEvent } from "./types";
import { PHYSICS } from "./constants";

const DT = PHYSICS.TICK_INTERVAL_MS / 1000; // 0.5s per tick

/**
 * Berechnet den nächsten Reaktorzustand (pure Funktion, aufgerufen bei jedem TICK).
 */
export function calculateNextState(state: ReactorState): Partial<ReactorState> {
  const events: GameEvent[] = [...state.events];
  const elapsed = state.elapsedSeconds + DT;

  // --- 3a. Reaktivität und Neutronenfluss ---
  const rodFraction = state.controlRods / PHYSICS.MAX_CONTROL_RODS; // 0..1, 1 = alle eingefahren
  const rodReactivity = 1 - rodFraction; // mehr Stäbe = weniger Reaktivität

  const xenonPenalty = state.xenonConcentration * PHYSICS.XENON_MAX_REACTIVITY_PENALTY;

  // Positiver Dampfblasenkoeffizient: Dampfblasen ERHÖHEN Reaktivität (RBMK-Fehler)
  const voidBoost = state.steamVoidFraction * PHYSICS.VOID_COEFFICIENT * 100;

  const reactivity = Math.max(0, Math.min(1, rodReactivity - xenonPenalty + voidBoost));

  // Neutronenfluss folgt Reaktivität mit Trägheit (exponentiell)
  const fluxInertia = 0.1; // Trägheitsfaktor
  let neutronFlux = state.neutronFlux + (reactivity - state.neutronFlux) * fluxInertia;

  // AZ-5 Graphit-Spitzen-Effekt
  let az5Active = state.az5Active;
  let az5Timer = state.az5Timer;
  let az5PrePower = state.az5PrePower;

  if (az5Active && az5Timer > 0) {
    neutronFlux = neutronFlux * PHYSICS.AZ5_GRAPHIT_POWER_MULTIPLIER;
    az5Timer -= DT;
    if (az5Timer <= 0) {
      az5Active = false;
      az5Timer = 0;
    }
  } else if (az5Active && az5Timer <= 0) {
    // Nach Spike: Reaktor fährt runter
    neutronFlux = neutronFlux * 0.1;
    if (neutronFlux < 0.01) {
      neutronFlux = 0;
      az5Active = false;
    }
  }

  neutronFlux = Math.max(0, Math.min(1, neutronFlux));

  // --- 3b. Thermische Leistung ---
  const powerInertia = 0.15;
  const targetPowerFromFlux = neutronFlux * PHYSICS.MAX_THERMAL_POWER;
  let thermalPower = state.thermalPower + (targetPowerFromFlux - state.thermalPower) * powerInertia;
  thermalPower = Math.max(0, thermalPower);

  // --- 3c. Xenon-Dynamik ---
  let xenonConcentration = state.xenonConcentration;
  const powerFraction = thermalPower / PHYSICS.NOMINAL_POWER;

  if (powerFraction < 0.5) {
    // Niedrige Leistung: Xenon baut sich auf
    xenonConcentration += PHYSICS.XENON_BUILD_RATE * DT;
  } else if (powerFraction > 0.7) {
    // Hohe Leistung: Xenon wird abgebrannt
    xenonConcentration -= PHYSICS.XENON_DECAY_RATE * DT;
  }
  // Zwischen 50-70%: langsame Änderung
  xenonConcentration = Math.max(0, Math.min(1, xenonConcentration));

  // --- 3d. Kühlmittel und Temperaturen ---
  const coolantFlowRate = state.activeCoolantPumps * PHYSICS.COOLANT_FLOW_PER_PUMP;
  const coolingCapacity = coolantFlowRate / PHYSICS.COOLANT_FLOW_NOMINAL; // 0..~1.14

  // ECCS-Effekt: Notkühlsystem reduziert Temperaturen
  const eccsFactor = state.eccsEnabled ? 1.3 : 1.0;
  const effectiveCooling = Math.max(0.01, coolingCapacity * eccsFactor); // nie 0 um Div/0 zu vermeiden

  // Brennstofftemperatur
  const heatGenerated = thermalPower / PHYSICS.MAX_THERMAL_POWER; // normalisiert 0..1
  const heatRemoved = effectiveCooling;
  const tempDelta = (heatGenerated - heatRemoved * 0.8) * 50; // Skalierungsfaktor
  let fuelTemperature = state.fuelTemperature + tempDelta * DT;
  fuelTemperature = Math.max(PHYSICS.COOLANT_TEMP_NOMINAL, fuelTemperature);

  // Kühlmitteltemperatur
  let coolantTemperature = PHYSICS.COOLANT_TEMP_NOMINAL +
    (thermalPower / PHYSICS.MAX_THERMAL_POWER) * 30 / Math.max(0.01, effectiveCooling);
  coolantTemperature = Math.max(PHYSICS.COOLANT_TEMP_NOMINAL, coolantTemperature);

  // Dampfblasenanteil (Void Fraction)
  let steamVoidFraction = 0;
  if (coolantTemperature > PHYSICS.COOLANT_TEMP_BOILING) {
    steamVoidFraction = Math.min(1,
      (coolantTemperature - PHYSICS.COOLANT_TEMP_BOILING) / 100
    );
  }

  // Dampfdruck
  let steamPressure = PHYSICS.STEAM_PRESSURE_NOMINAL +
    steamVoidFraction * 40 +
    (thermalPower / PHYSICS.MAX_THERMAL_POWER) * 20 -
    effectiveCooling * 15;
  steamPressure = Math.max(0, steamPressure);

  // Kerntemperaturzonen: leichte Variation der fuelTemperature
  const coreTemperatureZones: [number, number, number, number] = [
    fuelTemperature * 0.95,
    fuelTemperature * 1.05,
    fuelTemperature * 0.98,
    fuelTemperature * 1.02,
  ];

  // --- 3e. Spielende-Bedingungen ---
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

  // --- 3f. Ereignis-Generierung ---
  if (state.controlRods < PHYSICS.MINIMUM_SAFE_RODS && !hasRecentEvent(events, "MINIMALE STABABSENKUNG UNTERSCHRITTEN")) {
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
  };
}

/**
 * AZ-5 Notabschalter: Alle Stäbe einfahren + Graphit-Spitzen-Effekt.
 */
export function triggerAZ5(state: ReactorState): Partial<ReactorState> {
  const events = [...state.events];
  events.push({
    timestamp: state.elapsedSeconds,
    message: "AZ-5 AKTIVIERT — GRAPHIT-SPITZEN-EFFEKT DETEKTIERT",
    severity: 'critical',
  });

  let isExploded = state.isExploded;

  // Wenn Leistung > 80% vor AZ-5: Spike löst Kernschmelze aus
  if (state.thermalPower > PHYSICS.MAX_THERMAL_POWER * 0.8) {
    isExploded = true;
    events.push({
      timestamp: state.elapsedSeconds,
      message: "KERNSCHMELZE — REAKTOR 4 EXPLODIERT",
      severity: 'alarm',
    });
  }

  return {
    controlRods: PHYSICS.MAX_CONTROL_RODS,
    az5Active: true,
    az5Timer: PHYSICS.AZ5_GRAPHIT_SPIKE_DURATION,
    az5PrePower: state.thermalPower,
    events,
    isExploded,
  };
}

function hasRecentEvent(events: GameEvent[], message: string): boolean {
  return events.some(e => e.message === message);
}

function addEventIfNew(events: GameEvent[], timestamp: number, message: string, severity: GameEvent['severity']): void {
  if (!hasRecentEvent(events, message)) {
    events.push({ timestamp, message, severity });
  }
}
