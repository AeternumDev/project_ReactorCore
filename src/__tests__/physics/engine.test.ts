import { describe, expect, test } from "@jest/globals";
import { calculateNextState, createEquilibriumDelayedNeutronPrecursors, triggerAZ5 } from "@/lib/physics/engine";
import { PHYSICS } from "@/lib/physics/constants";
import { calculateScore } from "@/lib/game/scoring";
import { gameReducer, INITIAL_STATE } from "@/lib/game/reducer";
import { ReactorState } from "@/lib/physics/types";

function createTestState(overrides: Partial<ReactorState> = {}): ReactorState {
  const state = { ...INITIAL_STATE, isRunning: true, ...overrides };
  const hasControlOverride =
    Object.prototype.hasOwnProperty.call(overrides, 'controlRods') ||
    Object.prototype.hasOwnProperty.call(overrides, 'reactivityMargin');
  const hasRodOverride =
    Object.prototype.hasOwnProperty.call(overrides, 'manualRods') ||
    Object.prototype.hasOwnProperty.call(overrides, 'autoRods') ||
    Object.prototype.hasOwnProperty.call(overrides, 'shortenedRods') ||
    Object.prototype.hasOwnProperty.call(overrides, 'safetyRods');

  if (hasControlOverride && !hasRodOverride) {
    let remaining = Math.max(0, Math.min(PHYSICS.MAX_CONTROL_RODS, state.controlRods));
    state.manualRods = Math.min(PHYSICS.MANUAL_RODS_MAX, remaining);
    remaining -= state.manualRods;
    state.autoRods = Math.min(PHYSICS.AUTO_RODS_MAX, remaining);
    remaining -= state.autoRods;
    state.shortenedRods = Math.min(PHYSICS.SHORTENED_RODS_MAX, remaining);
    remaining -= state.shortenedRods;
    state.safetyRods = Math.min(PHYSICS.SAFETY_RODS_MAX, remaining);
  }

  if (hasRodOverride) {
    const totalRods = state.manualRods + state.autoRods + state.shortenedRods + state.safetyRods;
    state.controlRods = totalRods;
    state.reactivityMargin = totalRods;
  } else if (hasControlOverride) {
    const totalRods = state.manualRods + state.autoRods + state.shortenedRods + state.safetyRods;
    state.controlRods = totalRods;
    state.reactivityMargin = totalRods;
  }

  return state;
}

function advanceTicks(state: ReactorState, tickCount: number): ReactorState {
  let current = state;

  for (let tick = 0; tick < tickCount; tick += 1) {
    current = {
      ...current,
      ...calculateNextState(current),
      elapsedSeconds: current.elapsedSeconds + PHYSICS.TICK_INTERVAL_MS / 1000,
    };

    if (current.isExploded) {
      break;
    }
  }

  return current;
}

function advanceTicksWithPeaks(state: ReactorState, tickCount: number): {
  state: ReactorState;
  peakThermalPower: number;
  peakFuelTemperature: number;
  peakSteamPressure: number;
  peakSteamVoidFraction: number;
  peakCoreTemperature: number;
} {
  let current = state;
  let peakThermalPower = current.thermalPower;
  let peakFuelTemperature = current.fuelTemperature;
  let peakSteamPressure = current.steamPressure;
  let peakSteamVoidFraction = current.steamVoidFraction;
  let peakCoreTemperature = Math.max(...current.coreTemperatureZones);

  for (let tick = 0; tick < tickCount; tick += 1) {
    current = {
      ...current,
      ...calculateNextState(current),
      elapsedSeconds: current.elapsedSeconds + PHYSICS.TICK_INTERVAL_MS / 1000,
    };
    peakThermalPower = Math.max(peakThermalPower, current.thermalPower);
    peakFuelTemperature = Math.max(peakFuelTemperature, current.fuelTemperature);
    peakSteamPressure = Math.max(peakSteamPressure, current.steamPressure);
    peakSteamVoidFraction = Math.max(peakSteamVoidFraction, current.steamVoidFraction);
    peakCoreTemperature = Math.max(peakCoreTemperature, ...current.coreTemperatureZones);

    if (current.isExploded) {
      break;
    }
  }

  return {
    state: current,
    peakThermalPower,
    peakFuelTemperature,
    peakSteamPressure,
    peakSteamVoidFraction,
    peakCoreTemperature,
  };
}

describe("Physik-Engine", () => {
  test("Startzustand setzt den 700-MW-Test- und Xenon-Zustand", () => {
    expect(INITIAL_STATE.thermalPower).toBe(PHYSICS.TEST_POWER_TARGET);
    expect(INITIAL_STATE.reactivityMargin).toBe(31);
    expect(INITIAL_STATE.iodineConcentration).toBeCloseTo(0.49, 2);
    expect(INITIAL_STATE.xenonConcentration).toBeCloseTo(1.45, 2);
    expect(INITIAL_STATE.xenonConcentration).toBeGreaterThan(PHYSICS.XENON_WARNING_CONCENTRATION);
    expect(PHYSICS.POISON_TIME_SCALE).toBe(1);
  });

  test("700-MW-Testzustand rutscht unter Xenon ohne weitere Stabausfahrt ab", () => {
    const afterSlip = advanceTicks(createTestState(), 20);

    expect(afterSlip.thermalPower).toBeLessThan(PHYSICS.TEST_POWER_MIN);
    expect(afterSlip.events.some((event) => event.code === "power-below-test-target")).toBe(true);
  });

  test("700-MW-Start rutscht schnell, aber nicht in einem Tick, in den Xenon-Stall", () => {
    const afterFirstTick = advanceTicks(createTestState(), 1);
    const afterThreeSeconds = advanceTicks(createTestState(), 6);

    expect(afterFirstTick.thermalPower).toBeGreaterThan(500);
    expect(afterFirstTick.thermalPower).toBeLessThan(PHYSICS.TEST_POWER_TARGET);
    expect(afterThreeSeconds.thermalPower).toBeLessThan(300);
    expect(afterThreeSeconds.isExploded).toBe(false);
  });

  test("Xenon-Pit baut sich nach Leistungsabsenkung in Echtzeit auf", () => {
    // Reaktor lief auf Vollast (I, Xe ≈ 1) und fällt auf 500 MW (15 % Fluss).
    // Bei niedrigem Fluss überwiegt Iod→Xe‐Zerfall den Burnup → Xenon wächst.
    const state = createTestState({
      thermalPower: 500,
      neutronFlux: 500 / PHYSICS.NOMINAL_POWER,
      iodineConcentration: 1.0,
      xenonConcentration: 1.0,
      controlRods: 130,
    });
    const next = advanceTicks(state, 120);
    expect(next.xenonConcentration).toBeGreaterThan(1.0);
  });

  test("Xenon brennt bei hohem Fissionsfluss ab und gibt positive Reaktivität frei", () => {
    // Bei sehr hohem Fluss dominiert σφ·Xe → Xenon sinkt trotz vorhandenem Iod rasch.
    const state = createTestState({
      thermalPower: PHYSICS.PEAK_EXCURSION_POWER,
      neutronFlux: PHYSICS.PEAK_EXCURSION_POWER / PHYSICS.NOMINAL_POWER,
      iodineConcentration: 0.4,
      xenonConcentration: 1.8,
      steamVoidFraction: 0.3,
      manualRods: 0,
      autoRods: 0,
      shortenedRods: 0,
      safetyRods: 0,
    });
    const next = calculateNextState(state);
    expect(next.xenonConcentration!).toBeLessThan(1.8);
  });

  test("Xenon-Pit allein verursacht keine Kernschmelze", () => {
    const state = createTestState({
      thermalPower: 700,
      neutronFlux: 700 / PHYSICS.NOMINAL_POWER,
      iodineConcentration: 1.0,
      xenonConcentration: PHYSICS.XENON_SEVERE_CONCENTRATION,
      steamVoidFraction: 0,
      manualRods: 111,
      autoRods: 6,
      shortenedRods: 20,
      safetyRods: 8,
    });

    const afterPit = advanceTicks(state, 40);

    expect(afterPit.isExploded).toBe(false);
    expect(afterPit.thermalPower).toBeLessThanOrEqual(state.thermalPower);
  });

  test("Mehr Kühlmittelpumpen senken fuelTemperature", () => {
    const baseState = createTestState({
      thermalPower: 1000,
      neutronFlux: 1000 / PHYSICS.NOMINAL_POWER,
      fuelTemperature: 900,
      activeCoolantPumps: 2,
    });
    const moreState = createTestState({
      thermalPower: 1000,
      neutronFlux: 1000 / PHYSICS.NOMINAL_POWER,
      fuelTemperature: 900,
      activeCoolantPumps: 8,
    });
    const nextFew = calculateNextState(baseState);
    const nextMore = calculateNextState(moreState);
    expect(nextMore.fuelTemperature!).toBeLessThan(nextFew.fuelTemperature!);
  });

  test("0 Kühlmittelpumpen führen zu Temperaturanstieg", () => {
    const state = createTestState({
      thermalPower: 1000,
      neutronFlux: 1000 / PHYSICS.NOMINAL_POWER,
      fuelTemperature: 800,
      activeCoolantPumps: 0,
    });
    const next = calculateNextState(state);
    expect(next.fuelTemperature!).toBeGreaterThan(800);
  });

  test("Halbierter HKP-Durchfluss erhöht Void und Leistung (positive Void-Rückkopplung)", () => {
    // Regression: Pumpenausfall muss über Kanal-Austritts-Sieden Void erzeugen,
    // sodass der positive Dampfblasenkoeffizient Leistung und Brennstofftemperatur
    // anhebt – nicht senkt (RBMK Loss-of-Flow Verhalten).
    const baseOverrides = {
      thermalPower: 700,
      neutronFlux: 700 / PHYSICS.NOMINAL_POWER,
      fuelTemperature: PHYSICS.FUEL_TEMP_NOMINAL + 200,
      coolantTemperature: PHYSICS.COOLANT_TEMP_NOMINAL + 5,
      steamVoidFraction: 0,
      iodineConcentration: 1.0,
      xenonConcentration: PHYSICS.XENON_EQUILIBRIUM_CONCENTRATION,
      controlRods: 80,
    } as const;

    const fullPumps = advanceTicks(createTestState({ ...baseOverrides, activeCoolantPumps: 8 }), 8);
    const halfPumps = advanceTicks(createTestState({ ...baseOverrides, activeCoolantPumps: 4 }), 8);

    expect(halfPumps.steamVoidFraction).toBeGreaterThan(fullPumps.steamVoidFraction);
    expect(halfPumps.thermalPower).toBeGreaterThan(fullPumps.thermalPower);
  });

  test("Positiver Dampfblasenkoeffizient: steamVoidFraction erhöht Reaktivität", () => {
    const noVoid = createTestState({
      steamVoidFraction: 0,
      controlRods: 100,
      neutronFlux: 0.3,
      xenonConcentration: PHYSICS.XENON_EQUILIBRIUM_CONCENTRATION,
    });
    const withVoid = createTestState({
      steamVoidFraction: 0.5,
      controlRods: 100,
      neutronFlux: 0.3,
      xenonConcentration: PHYSICS.XENON_EQUILIBRIUM_CONCENTRATION,
    });
    const nextNoVoid = calculateNextState(noVoid);
    const nextWithVoid = calculateNextState(withVoid);
    // Higher void fraction → higher neutron flux → higher thermal power
    expect(nextWithVoid.neutronFlux!).toBeGreaterThan(nextNoVoid.neutronFlux!);
  });

  test("AZ-5 faehrt einen gesunden Reaktor herunter statt sofortiger Kernschmelze", () => {
    const state = createTestState({
      thermalPower: 1500,
      neutronFlux: 1500 / PHYSICS.NOMINAL_POWER,
      iodineConcentration: 1.0,
      xenonConcentration: PHYSICS.XENON_EQUILIBRIUM_CONCENTRATION,
      steamVoidFraction: 0,
      coolantTemperature: PHYSICS.COOLANT_TEMP_NOMINAL,
      manualRods: 111,
      autoRods: 6,
      shortenedRods: 20,
      safetyRods: 8,
    });
    const az5State = { ...state, ...triggerAZ5(state) };

    expect(az5State.az5Active).toBe(true);
    expect(az5State.az5Timer).toBe(PHYSICS.AZ5_FULL_INSERTION_TIME);
    expect(az5State.events.some(e => e.message.includes("AZ-5 AKTIVIERT"))).toBe(true);

    const afterScram = advanceTicks(az5State, 12);

    expect(afterScram.isExploded).toBe(false);
    expect(afterScram.controlRods).toBeGreaterThan(state.controlRods);
    expect(afterScram.thermalPower).toBeLessThan(state.thermalPower);
  });

  test("AZ-5 Graphit-Spitzen-Effekt bleibt an Unfallbedingungen gebunden", () => {
    const healthyCore = createTestState({
      thermalPower: 1500,
      neutronFlux: 1500 / PHYSICS.NOMINAL_POWER,
      iodineConcentration: 1.0,
      xenonConcentration: PHYSICS.XENON_EQUILIBRIUM_CONCENTRATION,
      steamVoidFraction: 0,
      coolantTemperature: PHYSICS.COOLANT_TEMP_NOMINAL,
      manualRods: 111,
      autoRods: 6,
      shortenedRods: 20,
      safetyRods: 8,
    });
    const accidentCore = createTestState({
      thermalPower: 200,
      neutronFlux: 0.06,
      xenonConcentration: 0.85,
      steamVoidFraction: 0.35,
      coolantTemperature: PHYSICS.COOLANT_TEMP_BOILING + 12,
      manualRods: 2,
      autoRods: 2,
      shortenedRods: 2,
      safetyRods: 4,
    });

    const healthyAfterAz5 = calculateNextState({ ...healthyCore, ...triggerAZ5(healthyCore) });
    const accidentAfterAz5 = calculateNextState({ ...accidentCore, ...triggerAZ5(accidentCore) });
    const healthyDelta = healthyAfterAz5.neutronFlux! - healthyCore.neutronFlux;
    const accidentDelta = accidentAfterAz5.neutronFlux! - accidentCore.neutronFlux;

    expect(healthyAfterAz5.neutronFlux!).toBeLessThan(healthyCore.neutronFlux);
    expect(accidentAfterAz5.neutronFlux!).toBeGreaterThan(accidentCore.neutronFlux);
    expect(accidentDelta).toBeGreaterThan(Math.abs(healthyDelta) * 5);
  });

  test("AZ-5 nutzt die globale Einfahrrate statt jede Stabgruppe separat zu vervierfachen", () => {
    const state = createTestState({
      thermalPower: 200,
      neutronFlux: 200 / PHYSICS.NOMINAL_POWER,
      manualRods: 2,
      autoRods: 1,
      shortenedRods: 1,
      safetyRods: 4,
    });

    const next = calculateNextState({ ...state, ...triggerAZ5(state) });

    expect(next.controlRods).toBe(14);
    expect(next.reactivityMargin).toBe(14);
  });

  test("Vorhandene Siedekanäle kollabieren bei Xenon-Stall nicht in einem Tick", () => {
    const state = createTestState({
      thermalPower: 20,
      neutronFlux: 20 / PHYSICS.NOMINAL_POWER,
      xenonConcentration: 1,
      coolantTemperature: 298,
      steamVoidFraction: 0.35,
      manualRods: 2,
      autoRods: 1,
      shortenedRods: 1,
      safetyRods: 4,
    });

    const next = calculateNextState({ ...state, ...triggerAZ5(state) });

    expect(next.coolantTemperature!).toBeGreaterThan(PHYSICS.COOLANT_TEMP_BOILING);
    expect(next.steamVoidFraction!).toBeGreaterThan(0.18);
  });

  test("Schwere Xenon-Vergiftung unterdrückt den AZ-5-Leistungssprung bei niedrigem OZR nicht", () => {
    const state = createTestState({
      thermalPower: 20,
      neutronFlux: 20 / PHYSICS.NOMINAL_POWER,
      xenonConcentration: 1,
      coolantTemperature: 298,
      steamVoidFraction: 0.35,
      manualRods: 2,
      autoRods: 1,
      shortenedRods: 1,
      safetyRods: 4,
    });

    const afterScram = advanceTicks({ ...state, ...triggerAZ5(state) }, 2);

    expect(afterScram.thermalPower).toBeGreaterThan(PHYSICS.TEST_POWER_TARGET);
    expect(afterScram.neutronFlux).toBeGreaterThan(0.6);
  });

  test("fuelTemperature >= 2800°C setzt isExploded = true", () => {
    const state = createTestState({
      fuelTemperature: 2850,
      thermalPower: 3000,
      neutronFlux: 0.9,
      activeCoolantPumps: 0,
      // Vollständiger Pumpenausfall: Drehzahl & Befehl auf null, sonst läuft die
      // Pumpendynamik die Drehzahl beim ersten Tick wieder hoch.
      pumpStates: [false, false, false, false, false, false, false, false],
      pumpSpeeds: [0, 0, 0, 0, 0, 0, 0, 0],
    });
    const next = calculateNextState(state);
    expect(next.isExploded).toBe(true);
  });

  test("steamPressure >= 95 bar setzt isExploded = true", () => {
    const state = createTestState({
      thermalPower: 3000,
      neutronFlux: 0.9,
      steamVoidFraction: 1,
      coolantTemperature: 430,
      fuelTemperature: 1500,
      activeCoolantPumps: 0,
      pumpStates: [false, false, false, false, false, false, false, false],
      pumpSpeeds: [0, 0, 0, 0, 0, 0, 0, 0],
    });
    const next = calculateNextState(state);
    // With high void fraction and low cooling, pressure should exceed critical
    expect(next.steamPressure!).toBeGreaterThanOrEqual(PHYSICS.STEAM_PRESSURE_CRITICAL);
    expect(next.isExploded).toBe(true);
  });

  test("elapsedSeconds >= 480 setzt testCompleted = true", () => {
    const state = createTestState({
      elapsedSeconds: PHYSICS.TEST_DURATION_SECONDS - 0.5,
      thermalPower: 700,
      neutronFlux: 700 / PHYSICS.NOMINAL_POWER,
      fuelTemperature: 650,
      steamPressure: 65,
    });
    const next = calculateNextState(state);
    // elapsedSeconds after tick = 480
    const newElapsed = state.elapsedSeconds + 0.5;
    expect(newElapsed).toBeGreaterThanOrEqual(PHYSICS.TEST_DURATION_SECONDS);
    expect(next.testCompleted).toBe(true);
  });

  test("Thermisches Residuum: Leistung fällt nie unter ~16 MW (thermalFloor)", () => {
    const state = createTestState({
      thermalPower: 20,
      neutronFlux: 0.001,
      xenonConcentration: 0.9,
      controlRods: 200,
    });
    const next = calculateNextState(state);
    expect(next.thermalPower!).toBeGreaterThanOrEqual(16);
  });

  test("AZ-5 post-spike: Leistung bleibt über Null (erholbar)", () => {
    const state = createTestState({
      thermalPower: 200,
      neutronFlux: 0.06,
      controlRods: 211,
      az5Active: true,
      az5Timer: 0, // post-spike phase
    });
    const next = calculateNextState(state);
    // Even after the transient, the model keeps residual heat above zero
    expect(next.neutronFlux!).toBeGreaterThan(0);
  });

  test("Reaktorstall erzeugt AZ-5-Prozedurwarnung", () => {
    const state = createTestState({
      thermalPower: 20,
      neutronFlux: 20 / PHYSICS.NOMINAL_POWER,
      events: [],
    });

    const next = calculateNextState(state);

    expect(next.events!.some((event) => event.code === "reactor-stalled-az5")).toBe(true);
  });
});

describe("Score-Berechnung", () => {
  test("Basiswert ist 10000 beim historischen 700-MW-Testzustand", () => {
    const previous = createTestState({
      thermalPower: PHYSICS.TEST_POWER_TARGET,
      events: [],
      testCompleted: false,
      eccsEnabled: false,
    });
    const state = { ...previous, elapsedSeconds: previous.elapsedSeconds + 0.5 };
    const update = calculateScore(previous, state);
    expect(update.score).toBe(PHYSICS.BASE_SCORE);
  });

  test("Zeitabzug wird pro Tick fortgeschrieben, wenn Leistung außerhalb des Haltekorridors liegt", () => {
    const previous = createTestState({
      thermalPower: 500, // below target
      events: [],
      testCompleted: false,
    });
    const state = { ...previous, elapsedSeconds: previous.elapsedSeconds + 0.5 };
    const update = calculateScore(previous, state);
    expect(update.score).toBeLessThan(PHYSICS.BASE_SCORE);
    expect(update.score).toBe(
      PHYSICS.BASE_SCORE - PHYSICS.SCORE_PENALTY_PER_SECOND_OFF_TARGET * 0.5
    );
  });

  test("Kein Abzug an der oberen Toleranzgrenze", () => {
    const previous = createTestState({
      thermalPower: PHYSICS.TEST_POWER_MAX,
      events: [],
      testCompleted: false,
    });
    const state = { ...previous, elapsedSeconds: previous.elapsedSeconds + 0.5 };
    const update = calculateScore(previous, state);
    expect(update.score).toBe(PHYSICS.BASE_SCORE);
  });

  test("Bonus bei testCompleted wird nur beim ersten Abschluss vergeben", () => {
    const previous = createTestState({
      thermalPower: PHYSICS.TEST_POWER_TARGET,
      events: [],
      testCompleted: false,
      eccsEnabled: true,
    });
    const state = { ...previous, testCompleted: true, elapsedSeconds: previous.elapsedSeconds + 0.5 };
    const firstUpdate = calculateScore(previous, state);
    const secondUpdate = calculateScore({ ...state, ...firstUpdate }, { ...state, ...firstUpdate, elapsedSeconds: state.elapsedSeconds + 0.5 });

    expect(firstUpdate.score).toBe(PHYSICS.BASE_SCORE + PHYSICS.SCORE_BONUS_TEST_SUCCESS);
    expect(secondUpdate.score).toBe(firstUpdate.score);
  });

  test("Bonus bei !eccsEnabled && testCompleted", () => {
    const previous = createTestState({
      thermalPower: PHYSICS.TEST_POWER_TARGET,
      events: [],
      testCompleted: false,
      eccsEnabled: false,
    });
    const state = { ...previous, testCompleted: true, elapsedSeconds: previous.elapsedSeconds + 0.5 };
    const update = calculateScore(previous, state);
    expect(update.score).toBe(
      PHYSICS.BASE_SCORE + PHYSICS.SCORE_BONUS_TEST_SUCCESS + PHYSICS.SCORE_BONUS_ECCS_DISABLED
    );
  });

  test("Stabile-Leistung-Bonus braucht 60 s fortlaufend nahe Zielwert", () => {
    const previous = createTestState({
      thermalPower: PHYSICS.TEST_POWER_TARGET,
      xenonConcentration: 0.4,
      elapsedSeconds: 59.5,
      events: [],
      testCompleted: false,
      scoreStablePowerSeconds: 59.5,
    });
    const state = { ...previous, elapsedSeconds: 60 };
    const update = calculateScore(previous, state);
    expect(update.score).toBe(PHYSICS.BASE_SCORE + PHYSICS.SCORE_BONUS_STABLE_LOW_POWER);
    expect(update.scoreAwardedStablePowerBonus).toBe(true);
  });

  test("Kein Stabile-Bonus bei Xenon-Pit (≥ 1.2)", () => {
    const previous = createTestState({
      thermalPower: PHYSICS.TEST_POWER_TARGET,
      xenonConcentration: 1.5,
      elapsedSeconds: 59.5,
      events: [],
      testCompleted: false,
      scoreStablePowerSeconds: 59.5,
    });
    const state = { ...previous, elapsedSeconds: 60 };
    const update = calculateScore(previous, state);
    // No stable bonus, just base score at the target power.
    expect(update.score).toBe(PHYSICS.BASE_SCORE);
    expect(update.scoreStablePowerSeconds).toBe(0);
  });

  test("Historischer 700-MW-Testzustand bekommt keinen separaten Danger-Bonus", () => {
    const previous = createTestState({
      thermalPower: PHYSICS.TEST_POWER_TARGET,
      events: [],
      testCompleted: false,
    });
    const state = { ...previous, elapsedSeconds: previous.elapsedSeconds + 0.5 };
    const update = calculateScore(previous, state);
    expect(update.score).toBe(PHYSICS.BASE_SCORE);
  });

  test("neue kritische und Alarm-Events werden nur einmal vom Score abgezogen", () => {
    const previous = createTestState({
      events: [],
      scorePenalizedEventCount: 0,
    });
    const state = {
      ...previous,
      elapsedSeconds: previous.elapsedSeconds + 0.5,
      events: [
        { timestamp: 0.5, message: "kritisch", severity: "critical" as const, code: "critical-test" },
        { timestamp: 0.5, message: "alarm", severity: "alarm" as const, code: "alarm-test" },
      ],
    };
    const firstUpdate = calculateScore(previous, state);
    const secondUpdate = calculateScore(
      { ...state, ...firstUpdate },
      { ...state, ...firstUpdate, elapsedSeconds: state.elapsedSeconds + 0.5 },
    );

    expect(firstUpdate.score).toBe(
      PHYSICS.BASE_SCORE - PHYSICS.SCORE_PENALTY_PER_CRITICAL - PHYSICS.SCORE_PENALTY_PER_ALARM
    );
    expect(secondUpdate.score).toBe(firstUpdate.score);
  });
});

describe("Game Reducer", () => {
  test("SET_CONTROL_RODS begrenzt auf 0–211", () => {
    const state = createTestState();

    const tooHigh = gameReducer(state, { type: "SET_CONTROL_RODS", payload: 300 });
    expect(tooHigh.controlRods).toBe(211);

    const tooLow = gameReducer(state, { type: "SET_CONTROL_RODS", payload: -10 });
    expect(tooLow.controlRods).toBe(0);

    const valid = gameReducer(state, { type: "SET_CONTROL_RODS", payload: 100 });
    expect(valid.controlRods).toBe(100);
  });

  test("TOGGLE_PUMP ändert pumpStates sofort, activeCoolantPumps läuft mit Schwungrad-Trägheit nach", () => {
    const state = createTestState();
    const initialPumps = state.activeCoolantPumps;

    // Pumpe 7 ausschalten → Befehl ist sofort umgesetzt, Drehzahl/Durchfluss laufen aus.
    const toggled = gameReducer(state, { type: "TOGGLE_PUMP", payload: 7 });
    expect(toggled.pumpStates[7]).toBe(false);
    // Reducer aktualisiert activeCoolantPumps NICHT mehr unmittelbar (ГЦН-Schwungrad).
    expect(toggled.activeCoolantPumps).toBe(initialPumps);

    // Nach mehreren Ticks muss der effektive Pumpenwert deutlich gesunken sein.
    const afterCoastdown = advanceTicks(toggled, 120); // 60 s Spielzeit
    expect(afterCoastdown.activeCoolantPumps).toBeLessThan(initialPumps - 0.5);
    expect(afterCoastdown.pumpSpeeds[7]).toBeLessThan(0.2);

    // Wieder einschalten → läuft mit Anlauf-Trägheit hoch.
    const toggledBack = gameReducer(afterCoastdown, { type: "TOGGLE_PUMP", payload: 7 });
    expect(toggledBack.pumpStates[7]).toBe(true);
    const afterSpinup = advanceTicks(toggledBack, 60); // 30 s
    expect(afterSpinup.pumpSpeeds[7]).toBeGreaterThan(0.8);
  });

  test("Reservebus abgeschaltet: Pumpen am Rundown-Bus folgen der TG-8-Drehzahl", () => {
    const state = createTestState({
      turbineConnected: false, // Turbine läuft aus
      turbineSpeed: 1500, // 50 % Nenndrehzahl
    });
    const busOff = gameReducer(state, { type: "TOGGLE_RUNDOWN_BUS" });
    expect(busOff.rundownBusActive).toBe(false);

    // Nach einigen Ticks sollten die Rundown-Bus-Pumpen (2,3,6,7) Richtung 0 driften
    // (weil Turbine weiter ausläuft), während die Netz-Pumpen (0,1,4,5) bei ~1 bleiben.
    const after = advanceTicks(busOff, 60); // 30 s
    const gridPumps = [0, 1, 4, 5].map((i) => after.pumpSpeeds[i]);
    const rundownPumps = [2, 3, 6, 7].map((i) => after.pumpSpeeds[i]);

    gridPumps.forEach((speed) => expect(speed).toBeGreaterThan(0.9));
    rundownPumps.forEach((speed) => expect(speed).toBeLessThan(0.5));
  });

  test("Vollständiger HKP-Ausfall erzeugt Void und Brennstoffaufheizung", () => {
    let state = gameReducer(INITIAL_STATE, { type: "START_GAME" });
    const initialFuelTemperature = state.fuelTemperature;

    for (let pumpIndex = 0; pumpIndex < 8; pumpIndex += 1) {
      state = gameReducer(state, { type: "TOGGLE_PUMP", payload: pumpIndex });
    }

    const afterTrip = advanceTicks(state, 120);

    expect(afterTrip.pumpStates.every((isCommandedOn) => !isCommandedOn)).toBe(true);
    expect(afterTrip.activeCoolantPumps).toBeLessThan(6);
    expect(afterTrip.steamVoidFraction).toBeGreaterThan(0.01);
    expect(afterTrip.thermalPower).toBeGreaterThan(INITIAL_STATE.thermalPower);
    expect(afterTrip.fuelTemperature).toBeGreaterThan(initialFuelTemperature);
  });

  test("Vollständiger HKP-Ausfall im Xenonstall erzeugt Void, Wärme und Leistungsanstieg", () => {
    let state = advanceTicks(createTestState(), 40);

    state = gameReducer(state, { type: "SET_MANUAL_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_AUTO_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_SHORTENED_RODS", payload: 0 });

    const stalledPower = state.thermalPower;
    const stalledFuelTemperature = state.fuelTemperature;

    for (let pumpIndex = 0; pumpIndex < 8; pumpIndex += 1) {
      state = gameReducer(state, { type: "TOGGLE_PUMP", payload: pumpIndex });
    }

    const pumpTrip = advanceTicksWithPeaks(state, 60);

    expect(state.pumpStates.every((isCommandedOn) => !isCommandedOn)).toBe(true);
    expect(pumpTrip.peakSteamVoidFraction).toBeGreaterThan(0.1);
    expect(pumpTrip.peakThermalPower).toBeGreaterThan(stalledPower * 2);
    expect(pumpTrip.peakFuelTemperature).toBeGreaterThan(stalledFuelTemperature + 200);
  });

  test("TICK wird ignoriert wenn isExploded = true", () => {
    const state = createTestState({
      isExploded: true,
      isRunning: true,
      elapsedSeconds: 100,
    });
    const next = gameReducer(state, { type: "TICK" });
    expect(next.elapsedSeconds).toBe(100); // unchanged
    expect(next).toBe(state); // same reference
  });

  test("START_GAME setzt INITIAL_STATE mit isRunning: true", () => {
    const state = createTestState({
      isExploded: true,
      elapsedSeconds: 300,
      score: 500,
    });
    const started = gameReducer(state, { type: "START_GAME" });
    expect(started.isRunning).toBe(true);
    expect(started.isExploded).toBe(false);
    expect(started.elapsedSeconds).toBe(0);
    expect(started.controlRods).toBe(INITIAL_STATE.controlRods);
    expect(started.xenonConcentration).toBe(INITIAL_STATE.xenonConcentration);
    expect(started.turbineAuto).toBe(false);
    expect(started.feedWaterAuto).toBe(false);
  });

  test("LAR-Automatik nutzt AR und MR, wenn AR-Stäbe allein nicht reichen", () => {
    const state = createTestState({
      thermalPower: 80,
      neutronFlux: 80 / PHYSICS.NOMINAL_POWER,
      powerMode: "auto",
      powerSetpoint: PHYSICS.TEST_POWER_TARGET,
      manualRods: 14,
      autoRods: 0,
      shortenedRods: 4,
      safetyRods: 4,
    });

    const afterAuto = advanceTicks(state, 20);

    expect(afterAuto.manualRods).toBeLessThan(state.manualRods);
    expect(afterAuto.reactivityMargin).toBeGreaterThanOrEqual(PHYSICS.OZR_MINIMUM_SAFE + 1);
  });

  test("Speisewasser-Automatik senkt hohen Trommelstand und fährt Durchfluss zurück", () => {
    const state = createTestState({
      feedWaterAuto: true,
      drumSeparatorLevel: 75,
      feedWaterFlow: 800,
    });

    const next = calculateNextState(state);

    expect(next.feedWaterFlow!).toBeLessThan(state.feedWaterFlow);
  });

  test("Speisewasser-Automatik hebt niedrigen Trommelstand mit mehr Durchfluss an", () => {
    const state = createTestState({
      feedWaterAuto: true,
      drumSeparatorLevel: 15,
      feedWaterFlow: 300,
    });

    const next = calculateNextState(state);

    expect(next.feedWaterFlow!).toBeGreaterThan(state.feedWaterFlow);
  });

  test("TG-8-Automatik öffnet das Ventil bei verbundener Turbine und niedriger Drehzahl", () => {
    const state = createTestState({
      turbineAuto: true,
      turbineConnected: true,
      turbineValveOpen: 20,
      turbineSpeed: 2200,
    });

    const next = calculateNextState(state);

    expect(next.turbineConnected).toBe(true);
    expect(next.turbineValveOpen!).toBeGreaterThan(state.turbineValveOpen);
  });

  test("TG-8-Automatik lässt eine getrennte Turbine getrennt und schließt das Ventil", () => {
    const state = createTestState({
      turbineAuto: true,
      turbineConnected: false,
      turbineValveOpen: 60,
      turbineSpeed: 1800,
    });

    const next = calculateNextState(state);

    expect(next.turbineConnected).toBe(false);
    expect(next.turbineValveOpen!).toBeLessThan(state.turbineValveOpen);
  });

  test("TG-8-Automatik schließt bei Überdrehzahl", () => {
    const state = createTestState({
      turbineAuto: true,
      turbineConnected: true,
      turbineValveOpen: 55,
      turbineSpeed: PHYSICS.TURBINE_NOMINAL_SPEED * 1.04,
    });

    const next = calculateNextState(state);

    expect(next.turbineValveOpen!).toBeLessThan(state.turbineValveOpen);
  });

  test("Live-Szenario kann OZR bis in den Unfallbereich absenken", () => {
    let state = { ...INITIAL_STATE };

    state = gameReducer(state, { type: "SET_MANUAL_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_AUTO_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_SHORTENED_RODS", payload: 0 });

    expect(state.controlRods).toBeLessThan(PHYSICS.OZR_MINIMUM_SAFE);
    expect(state.reactivityMargin).toBeLessThan(PHYSICS.OZR_MINIMUM_SAFE);
  });

  test("Live-Xenonstall bleibt nach voller Stabausfahrt schwer erholbar", () => {
    let state = advanceTicks(createTestState(), 20);

    state = gameReducer(state, { type: "SET_MANUAL_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_AUTO_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_SHORTENED_RODS", payload: 0 });

    const afterRecoveryAttempt = advanceTicks(state, 40);

    expect(afterRecoveryAttempt.reactivityMargin).toBeLessThan(PHYSICS.OZR_MINIMUM_SAFE);
    expect(afterRecoveryAttempt.xenonConcentration).toBeGreaterThan(PHYSICS.XENON_WARNING_CONCENTRATION);
    expect(afterRecoveryAttempt.thermalPower).toBeLessThan(PHYSICS.TEST_POWER_MIN);
    expect(afterRecoveryAttempt.isExploded).toBe(false);
  });

  test("AZ-5 nach Live-Xenonstall und voller Stabausfahrt zerstoert den Reaktor", () => {
    let state = advanceTicks(createTestState(), 20);

    state = gameReducer(state, { type: "SET_MANUAL_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_AUTO_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_SHORTENED_RODS", payload: 0 });
    state = advanceTicks(state, 20);

    const az5State = gameReducer(state, { type: "TRIGGER_AZ5" });
    const firstSecond = advanceTicks(az5State, 2);
    const midWindow = advanceTicks(az5State, 8);
    const beforeExplosion = advanceTicks(az5State, (PHYSICS.AZ5_EXPLOSION_DELAY_SECONDS * 2) - 1);
    const afterScram = advanceTicks(az5State, PHYSICS.AZ5_EXPLOSION_DELAY_SECONDS * 2);

    expect(firstSecond.thermalPower).toBeLessThan(PHYSICS.TEST_POWER_TARGET);
    expect(midWindow.thermalPower).toBeGreaterThan(PHYSICS.TEST_POWER_TARGET);
    expect(midWindow.thermalPower).toBeLessThan(PHYSICS.PEAK_EXCURSION_POWER * 0.15);
    expect(beforeExplosion.isExploded).toBe(false);
    expect(beforeExplosion.az5TerminalDamage).toBe(true);
    expect(beforeExplosion.thermalPower).toBeGreaterThan(PHYSICS.TEST_POWER_TARGET);
    expect(beforeExplosion.steamPressure).toBeGreaterThan(PHYSICS.STEAM_PRESSURE_CRITICAL);
    expect(afterScram.isExploded).toBe(true);
    expect(afterScram.thermalPower).toBeGreaterThanOrEqual(PHYSICS.PEAK_EXCURSION_POWER * 0.99);
    expect(afterScram.thermalPower).toBeLessThanOrEqual(PHYSICS.PEAK_EXCURSION_POWER);
    expect(
      afterScram.events.some((event) =>
        event.code === "meltdown" || event.code === "pressure-explosion"
      )
    ).toBe(true);
  });

  test("Unmittelbares AZ-5 nach Stab-Ausfahrt speichert den aktuellen OZR statt des letzten Tick-Werts", () => {
    let state = {
      ...INITIAL_STATE,
      isRunning: true,
      thermalPower: 20,
      neutronFlux: 20 / PHYSICS.NOMINAL_POWER,
      xenonConcentration: 1,
      coolantTemperature: 298,
      steamVoidFraction: 0.35,
      fuelTemperature: 700,
    };

    state = gameReducer(state, { type: "SET_MANUAL_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_AUTO_RODS", payload: 0 });
    state = gameReducer(state, { type: "SET_SHORTENED_RODS", payload: 0 });

    const az5State = gameReducer(state, { type: "TRIGGER_AZ5" });

    expect(az5State.az5PreMargin).toBe(az5State.controlRods);
    expect(az5State.az5PreMargin).toBeLessThan(PHYSICS.OZR_MINIMUM_SAFE);
  });

  test("AZ-5 bei 100% Xenon und OZR < 15 führt zur Kernschmelze / Dampfexplosion", () => {
    const state = createTestState({
      thermalPower: 20,
      neutronFlux: 20 / PHYSICS.NOMINAL_POWER,
      xenonConcentration: 1,
      coolantTemperature: 298,
      steamVoidFraction: 0.35,
      fuelTemperature: 700,
      manualRods: 0,
      autoRods: 0,
      shortenedRods: 0,
      safetyRods: 8,
    });

    const afterScram = advanceTicks({ ...state, ...triggerAZ5(state) }, 10);

    expect(afterScram.isExploded).toBe(true);
    expect(afterScram.events.some((event) => event.code === "meltdown")).toBe(true);
  });

  test("AZ-5 bei Xenon-Pit, OZR < 15 und Void führt zur Chernobyl-artigen Exkursion", () => {
    const state = createTestState({
      thermalPower: 20,
      neutronFlux: 20 / PHYSICS.NOMINAL_POWER,
      xenonConcentration: PHYSICS.XENON_SEVERE_CONCENTRATION,
      coolantTemperature: 298,
      steamVoidFraction: 0.35,
      fuelTemperature: 700,
      manualRods: 0,
      autoRods: 0,
      shortenedRods: 0,
      safetyRods: 8,
    });

    const warningWindow = advanceTicksWithPeaks({ ...state, ...triggerAZ5(state) }, (PHYSICS.AZ5_EXPLOSION_DELAY_SECONDS * 2) - 1);
    const beforeExplosion = warningWindow.state;
    const afterScram = advanceTicks({ ...state, ...triggerAZ5(state) }, PHYSICS.AZ5_EXPLOSION_DELAY_SECONDS * 2);

    expect(beforeExplosion.isExploded).toBe(false);
    expect(beforeExplosion.az5TerminalDamage).toBe(true);
    expect(warningWindow.peakFuelTemperature).toBeGreaterThan(PHYSICS.FUEL_TEMP_WARNING);
    expect(warningWindow.peakCoreTemperature).toBeGreaterThan(PHYSICS.FUEL_TEMP_WARNING);
    expect(warningWindow.peakThermalPower).toBeGreaterThan(PHYSICS.TEST_POWER_TARGET);
    expect(afterScram.isExploded).toBe(true);
    expect(
      afterScram.events.some((event) =>
        event.code === "meltdown" || event.code === "pressure-explosion"
      )
    ).toBe(true);
  });

  test("AZ-5 bei 16 MW, Xenon-Pit und OZR < 15 erzeugt auch ohne Start-Void eine Exkursion", () => {
    const lowPowerFlux = PHYSICS.DECAY_HEAT_FLOOR / PHYSICS.NOMINAL_POWER;
    const state = createTestState({
      thermalPower: PHYSICS.DECAY_HEAT_FLOOR,
      neutronFlux: lowPowerFlux,
      delayedNeutronPrecursors: createEquilibriumDelayedNeutronPrecursors(lowPowerFlux),
      xenonConcentration: PHYSICS.XENON_SEVERE_CONCENTRATION,
      coolantTemperature: PHYSICS.COOLANT_TEMP_NOMINAL,
      steamVoidFraction: 0,
      fuelTemperature: 700,
      manualRods: 0,
      autoRods: 0,
      shortenedRods: 0,
      safetyRods: 8,
    });

    const warningWindow = advanceTicksWithPeaks({ ...state, ...triggerAZ5(state) }, (PHYSICS.AZ5_EXPLOSION_DELAY_SECONDS * 2) - 1);
    const beforeExplosion = warningWindow.state;
    const afterScram = advanceTicks({ ...state, ...triggerAZ5(state) }, PHYSICS.AZ5_EXPLOSION_DELAY_SECONDS * 2);

    expect(beforeExplosion.isExploded).toBe(false);
    expect(beforeExplosion.az5TerminalDamage).toBe(true);
    expect(warningWindow.peakThermalPower).toBeGreaterThan(PHYSICS.TEST_POWER_TARGET);
    expect(warningWindow.peakFuelTemperature).toBeGreaterThan(PHYSICS.FUEL_TEMP_WARNING);
    expect(afterScram.isExploded).toBe(true);
    expect(
      afterScram.events.some((event) =>
        event.code === "meltdown" || event.code === "pressure-explosion"
      )
    ).toBe(true);
  });

  test("AZ-5 bei 147% Xenon und OZR < 15 fuehrt bei 700 MW zur Exkursion", () => {
    const testFlux = PHYSICS.TEST_POWER_TARGET / PHYSICS.NOMINAL_POWER;
    const state = createTestState({
      thermalPower: PHYSICS.TEST_POWER_TARGET,
      neutronFlux: testFlux,
      delayedNeutronPrecursors: createEquilibriumDelayedNeutronPrecursors(testFlux),
      xenonConcentration: 1.47,
      coolantTemperature: PHYSICS.COOLANT_TEMP_NOMINAL,
      steamVoidFraction: 0,
      fuelTemperature: 700,
      manualRods: 0,
      autoRods: 0,
      shortenedRods: 0,
      safetyRods: 8,
    });

    const earlyScram = advanceTicks({ ...state, ...triggerAZ5(state) }, 8);
    const afterScram = advanceTicks({ ...state, ...triggerAZ5(state) }, PHYSICS.AZ5_EXPLOSION_DELAY_SECONDS * 2);

    expect(earlyScram.thermalPower).toBeGreaterThan(PHYSICS.TEST_POWER_TARGET);
    expect(earlyScram.isExploded).toBe(false);
    expect(afterScram.az5TerminalDamage).toBe(true);
    expect(afterScram.isExploded).toBe(true);
    expect(
      afterScram.events.some((event) =>
        event.code === "meltdown" || event.code === "pressure-explosion"
      )
    ).toBe(true);
  });

  test("AZ-5 bei hohem Xenon aber OZR > 30 bleibt eine sichere Abschaltung", () => {
    const state = createTestState();

    const afterScram = advanceTicks({ ...state, ...triggerAZ5(state) }, 20);

    expect(state.xenonConcentration).toBeGreaterThan(PHYSICS.XENON_WARNING_CONCENTRATION);
    expect(state.reactivityMargin).toBeGreaterThan(PHYSICS.OZR_WARNING);
    expect(afterScram.isExploded).toBe(false);
    expect(afterScram.thermalPower).toBeLessThan(state.thermalPower);
  });

  test("AZ-5 bei OZR > 30 und Xenon nahe Gleichgewicht fährt sicher herunter", () => {
    const lowPowerFlux = 400 / PHYSICS.NOMINAL_POWER;
    const state = createTestState({
      thermalPower: 400,
      neutronFlux: lowPowerFlux,
      delayedNeutronPrecursors: createEquilibriumDelayedNeutronPrecursors(lowPowerFlux),
      xenonConcentration: 1.0,
      coolantTemperature: 278,
      steamVoidFraction: 0.05,
      fuelTemperature: 800,
      manualRods: 100,
      autoRods: 8,
      shortenedRods: 20,
      safetyRods: 8,
    });

    const afterScram = advanceTicks({ ...state, ...triggerAZ5(state) }, 20);

    expect(afterScram.isExploded).toBe(false);
    expect(afterScram.thermalPower).toBeLessThan(state.thermalPower);
  });
});
