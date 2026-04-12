import { calculateNextState, triggerAZ5 } from "@/lib/physics/engine";
import { PHYSICS } from "@/lib/physics/constants";
import { calculateScore } from "@/lib/game/scoring";
import { gameReducer, INITIAL_STATE } from "@/lib/game/reducer";
import { ReactorState } from "@/lib/physics/types";

function createTestState(overrides: Partial<ReactorState> = {}): ReactorState {
  return { ...INITIAL_STATE, isRunning: true, ...overrides };
}

describe("Physik-Engine", () => {
  test("Xenon steigt bei niedriger Leistung (< 50% nominal)", () => {
    const state = createTestState({
      thermalPower: 200, // ~6% of 3200 → well below 50%
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
      thermalPower: 800,
      neutronFlux: 0.25,
      fuelTemperature: 650,
      steamPressure: 65,
    });
    const next = calculateNextState(state);
    // elapsedSeconds after tick = 480
    const newElapsed = state.elapsedSeconds + 0.5;
    expect(newElapsed).toBeGreaterThanOrEqual(PHYSICS.TEST_DURATION_SECONDS);
    expect(next.testCompleted).toBe(true);
  });
});

describe("Score-Berechnung", () => {
  test("Basiswert ist 10000", () => {
    const state = createTestState({
      thermalPower: 800, // within target range
      events: [],
      testCompleted: false,
      eccsEnabled: false,
    });
    const score = calculateScore(state);
    expect(score).toBe(PHYSICS.BASE_SCORE);
  });

  test("Abzug wenn Leistung außerhalb 700–1000 MW", () => {
    const state = createTestState({
      thermalPower: 200, // below target
      events: [],
      testCompleted: false,
    });
    const score = calculateScore(state);
    expect(score).toBeLessThan(PHYSICS.BASE_SCORE);
    expect(score).toBe(PHYSICS.BASE_SCORE - PHYSICS.SCORE_PENALTY_PER_SECOND_OFF_TARGET);
  });

  test("Bonus bei testCompleted", () => {
    const state = createTestState({
      thermalPower: 800,
      events: [],
      testCompleted: true,
      eccsEnabled: true,
    });
    const score = calculateScore(state);
    expect(score).toBe(PHYSICS.BASE_SCORE + PHYSICS.SCORE_BONUS_TEST_SUCCESS);
  });

  test("Bonus bei !eccsEnabled && testCompleted", () => {
    const state = createTestState({
      thermalPower: 800,
      events: [],
      testCompleted: true,
      eccsEnabled: false,
    });
    const score = calculateScore(state);
    expect(score).toBe(
      PHYSICS.BASE_SCORE + PHYSICS.SCORE_BONUS_TEST_SUCCESS + PHYSICS.SCORE_BONUS_ECCS_DISABLED
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

    // Toggle pump 6 (currently off) → should increase active count
    const toggled = gameReducer(state, { type: "TOGGLE_PUMP", payload: 6 });
    expect(toggled.activeCoolantPumps).toBe(initialPumps + 1);
    expect(toggled.pumpStates[6]).toBe(true);

    // Toggle same pump again → should decrease
    const toggledBack = gameReducer(toggled, { type: "TOGGLE_PUMP", payload: 6 });
    expect(toggledBack.activeCoolantPumps).toBe(initialPumps);
    expect(toggledBack.pumpStates[6]).toBe(false);
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
