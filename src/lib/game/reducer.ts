import { ReactorState, GameAction } from "@/lib/physics/types";
import { calculateNextState, triggerAZ5 } from "@/lib/physics/engine";
import { PHYSICS } from "@/lib/physics/constants";
import { calculateScore } from "./scoring";

export const INITIAL_STATE: ReactorState = {
  controlRods: 205,
  activeCoolantPumps: 6,
  eccsEnabled: false,
  coolantFlowRate: 6 * PHYSICS.COOLANT_FLOW_PER_PUMP,

  thermalPower: 200,
  neutronFlux: 200 / PHYSICS.MAX_THERMAL_POWER,
  xenonConcentration: 0.6,
  coolantTemperature: PHYSICS.COOLANT_TEMP_NOMINAL,
  fuelTemperature: PHYSICS.FUEL_TEMP_NOMINAL,
  steamPressure: PHYSICS.STEAM_PRESSURE_NOMINAL,
  steamVoidFraction: 0,
  coreTemperatureZones: [
    PHYSICS.FUEL_TEMP_NOMINAL * 0.95,
    PHYSICS.FUEL_TEMP_NOMINAL * 1.05,
    PHYSICS.FUEL_TEMP_NOMINAL * 0.98,
    PHYSICS.FUEL_TEMP_NOMINAL * 1.02,
  ],

  isRunning: false,
  isExploded: false,
  testCompleted: false,
  elapsedSeconds: 0,
  score: PHYSICS.BASE_SCORE,
  events: [],

  targetPower: 700,
  xenonBuildupRate: 0,
  lastPowerLevel: 200,

  az5Active: false,
  az5Timer: 0,
  az5PrePower: 0,
  pumpStates: [true, true, true, true, true, true, false, false],
};

export function gameReducer(state: ReactorState, action: GameAction): ReactorState {
  switch (action.type) {
    case 'TICK': {
      if (!state.isRunning || state.isExploded || state.testCompleted) return state;
      const next = calculateNextState(state);
      const newState = {
        ...state,
        ...next,
        elapsedSeconds: state.elapsedSeconds + 0.5,
      };
      newState.score = calculateScore(newState);
      return newState;
    }

    case 'SET_CONTROL_RODS':
      return {
        ...state,
        controlRods: Math.max(0, Math.min(PHYSICS.MAX_CONTROL_RODS, action.payload)),
      };

    case 'TOGGLE_PUMP': {
      const pumpIndex = action.payload;
      if (pumpIndex < 0 || pumpIndex > 7) return state;
      const newPumpStates = [...state.pumpStates] as ReactorState['pumpStates'];
      newPumpStates[pumpIndex] = !newPumpStates[pumpIndex];
      const activePumps = newPumpStates.filter(Boolean).length;
      return {
        ...state,
        pumpStates: newPumpStates,
        activeCoolantPumps: activePumps,
        coolantFlowRate: activePumps * PHYSICS.COOLANT_FLOW_PER_PUMP,
      };
    }

    case 'TOGGLE_ECCS':
      return { ...state, eccsEnabled: !state.eccsEnabled };

    case 'SET_COOLANT_FLOW':
      return {
        ...state,
        coolantFlowRate: Math.max(0, Math.min(10000, action.payload)),
      };

    case 'TRIGGER_AZ5':
      return { ...state, ...triggerAZ5(state) };

    case 'START_GAME':
      return { ...INITIAL_STATE, isRunning: true };

    case 'RESET_GAME':
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}
