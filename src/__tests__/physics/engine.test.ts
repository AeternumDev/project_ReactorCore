import { calculateNextState, triggerAZ5 } from "@/lib/physics/engine";
import { PHYSICS } from "@/lib/physics/constants";
import { calculateScore } from "@/lib/game/scoring";
import { gameReducer, INITIAL_STATE } from "@/lib/game/reducer";
import { ReactorState } from "@/lib/physics/types";

function createTestState(overrides: Partial<ReactorState> = {}): ReactorState {
  return { ...INITIAL_STATE, isRunning: true, ...overrides };
}

describe("Physik-Engine", () => {
  test("Xenon steigt bei niedriger Leistung (< 700 MW Ziel)", () => {
    const state = createTestState({
      thermalPower: 500, // unter 700 MW → Xenon-Aufbau
      neutronFlux: 500 / PHYSICS.MAX_THERMAL_POWER,
      xenonConcentration: 0.3,
    });
    const next = calculateNextState(state);
    expect(next.xenonConcentration!).toBeGreaterThan(0.3);
  });

  test("Xenon sinkt bei hoher Leistung (> 70% nominal)", () => {
    const state = createTestState({
      thermalPower: 2500, // ~78% of 3200
      neutronFlux: 2500 / PHYSICS.MAX_THERMAL_POWER,
      xenonConcentration: 0.5,
      controlRods: 50,
    });
    const next = calculateNextState(state);
    expect(next.xenonConcentration!).toBeLessThan(0.5);
  });

  test("Mehr Kühlmittelpumpen senken fuelTemperature", () => {
    const baseState = createTestState({
      thermalPower: 1000,
      neutronFlux: 1000 / PHYSICS.MAX_THERMAL_POWER,
      fuelTemperature: 900,
      activeCoolantPumps: 2,
    });
    const moreState = createTestState({
      thermalPower: 1000,
      neutronFlux: 1000 / PHYSICS.MAX_THERMAL_POWER,
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
      neutronFlux: 1000 / PHYSICS.MAX_THERMAL_POWER,
      fuelTemperature: 800,
      activeCoolantPumps: 0,
    });
    const next = calculateNextState(state);
    expect(next.fuelTemperature!).toBeGreaterThan(800);
  });

  test("Positiver Dampfblasenkoeffizient: steamVoidFraction erhöht Reaktivität", () => {
    const noVoid = createTestState({
      steamVoidFraction: 0,
      controlRods: 100,
      neutronFlux: 0.3,
      xenonConcentration: 0,
    });
    const withVoid = createTestState({
      steamVoidFraction: 0.5,
      controlRods: 100,
      neutronFlux: 0.3,
      xenonConcentration: 0,
    });
    const nextNoVoid = calculateNextState(noVoid);
    const nextWithVoid = calculateNextState(withVoid);
    // Higher void fraction → higher neutron flux → higher thermal power
    expect(nextWithVoid.neutronFlux!).toBeGreaterThan(nextNoVoid.neutronFlux!);
  });

  test("AZ-5 erzeugt Graphit-Spitzen-Effekt (kurzfristiger Leistungsanstieg)", () => {
    const state = createTestState({
      thermalPower: 500,
      neutronFlux: 0.15,
      controlRods: 100,
    });
    const az5Result = triggerAZ5(state);
    expect(az5Result.controlRods).toBe(211);
    expect(az5Result.az5Active).toBe(true);
    expect(az5Result.az5Timer).toBe(PHYSICS.AZ5_GRAPHIT_SPIKE_DURATION);
    expect(az5Result.events!.some(e => e.message.includes("AZ-5 AKTIVIERT"))).toBe(true);

    // After AZ5 triggered, next tick should show flux spike
    const stateAfterAZ5 = { ...state, ...az5Result };
    const next = calculateNextState(stateAfterAZ5);
    // Neutron flux should be elevated due to graphite spike multiplier
    expect(next.neutronFlux!).toBeGreaterThan(state.neutronFlux);
  });

  test("fuelTemperature >= 2800°C setzt isExploded = true", () => {
    const state = createTestState({
      fuelTemperature: 2850,
      thermalPower: 3000,
      neutronFlux: 0.9,
      activeCoolantPumps: 0,
    });
    const next = calculateNextState(state);
    expect(next.isExploded).toBe(true);
  });

  test("steamPressure >= 95 bar setzt isExploded = true", () => {
    const state = createTestState({
      thermalPower: 3000,
      neutronFlux: 0.9,
      steamVoidFraction: 0.9,
      coolantTemperature: 400,
      fuelTemperature: 1500,
      activeCoolantPumps: 0,
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
      neutronFlux: 700 / PHYSICS.MAX_THERMAL_POWER,
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
    // With 0.5 multiplier and 0.005 floor, flux should not go to zero
    expect(next.neutronFlux!).toBeGreaterThan(0);
  });
});

describe("Score-Berechnung", () => {
  test("Basiswert ist 10000 bei 700 MW (Zielband 700–1000)", () => {
    const state = createTestState({
      thermalPower: 700, // within 700–1000 target range
      events: [],
      testCompleted: false,
      eccsEnabled: false,
    });
    const score = calculateScore(state);
    expect(score).toBe(PHYSICS.BASE_SCORE);
  });

  test("Abzug wenn Leistung außerhalb 700–1000 MW", () => {
    const state = createTestState({
      thermalPower: 500, // below target
      events: [],
      testCompleted: false,
    });
    const score = calculateScore(state);
    expect(score).toBeLessThan(PHYSICS.BASE_SCORE);
    expect(score).toBe(PHYSICS.BASE_SCORE - PHYSICS.SCORE_PENALTY_PER_SECOND_OFF_TARGET);
  });

  test("Kein Abzug bei 1000 MW (obere Grenze)", () => {
    const state = createTestState({
      thermalPower: 1000,
      events: [],
      testCompleted: false,
    });
    const score = calculateScore(state);
    expect(score).toBe(PHYSICS.BASE_SCORE);
  });

  test("Bonus bei testCompleted", () => {
    const state = createTestState({
      thermalPower: 700,
      events: [],
      testCompleted: true,
      eccsEnabled: true,
    });
    const score = calculateScore(state);
    expect(score).toBe(PHYSICS.BASE_SCORE + PHYSICS.SCORE_BONUS_TEST_SUCCESS);
  });

  test("Bonus bei !eccsEnabled && testCompleted", () => {
    const state = createTestState({
      thermalPower: 700,
      events: [],
      testCompleted: true,
      eccsEnabled: false,
    });
    const score = calculateScore(state);
    expect(score).toBe(
      PHYSICS.BASE_SCORE + PHYSICS.SCORE_BONUS_TEST_SUCCESS + PHYSICS.SCORE_BONUS_ECCS_DISABLED
    );
  });

  test("Stabile-Leistung-Bonus nach 60 s im 700–1000 MW Zielband", () => {
    const state = createTestState({
      thermalPower: 800,
      xenonConcentration: 0.4,
      elapsedSeconds: 65,
      events: [],
      testCompleted: false,
    });
    const score = calculateScore(state);
    expect(score).toBe(PHYSICS.BASE_SCORE + PHYSICS.SCORE_BONUS_STABLE_LOW_POWER);
  });

  test("Kein Stabile-Bonus bei hohem Xenon (≥ 0.7)", () => {
    const state = createTestState({
      thermalPower: 800,
      xenonConcentration: 0.75,
      elapsedSeconds: 65,
      events: [],
      testCompleted: false,
    });
    const score = calculateScore(state);
    // No stable bonus, just base + off-target penalty (800 is in range, so just base)
    expect(score).toBe(PHYSICS.BASE_SCORE);
  });

  test("Danger Zone Risiko-Bonus bei ~200 MW", () => {
    const state = createTestState({
      thermalPower: 200,
      events: [],
      testCompleted: false,
    });
    const score = calculateScore(state);
    // Off-target penalty + danger zone bonus
    expect(score).toBe(
      PHYSICS.BASE_SCORE - PHYSICS.SCORE_PENALTY_PER_SECOND_OFF_TARGET + PHYSICS.SCORE_BONUS_DANGER_ZONE
    );
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

  test("TOGGLE_PUMP ändert activeCoolantPumps korrekt", () => {
    const state = createTestState();
    const initialPumps = state.activeCoolantPumps;

    // Toggle pump 7 (currently on) → should decrease active count
    const toggled = gameReducer(state, { type: "TOGGLE_PUMP", payload: 7 });
    expect(toggled.activeCoolantPumps).toBe(initialPumps - 1);
    expect(toggled.pumpStates[7]).toBe(false);

    // Toggle same pump again → should increase
    const toggledBack = gameReducer(toggled, { type: "TOGGLE_PUMP", payload: 7 });
    expect(toggledBack.activeCoolantPumps).toBe(initialPumps);
    expect(toggledBack.pumpStates[7]).toBe(true);
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
  });
});
