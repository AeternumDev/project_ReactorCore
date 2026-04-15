import { ReactorState, GameAction } from "@/lib/physics/types";
import {
  calculateNextState,
  createEquilibriumDelayedNeutronPrecursors,
  triggerAZ5,
  triggerBAZ,
} from "@/lib/physics/engine";
import { PHYSICS } from "@/lib/physics/constants";
import { calculateScore } from "./scoring";

const INITIAL_NEUTRON_FLUX = 1500 / PHYSICS.MAX_THERMAL_POWER;

export const INITIAL_STATE: ReactorState = {
  controlRods: 145,
  activeCoolantPumps: 8,
  eccsEnabled: false,
  coolantFlowRate: 8 * PHYSICS.COOLANT_FLOW_PER_PUMP,

  // Stabgruppen — 145 eingefahrene Stabäquivalente, aber mit realistisch kleinem AZ-Anteil.
  // So bleibt der Startzustand stabil, waehrend der Spieler den OZR spaeter in den Unfallbereich ziehen kann.
  manualRods: 111,
  autoRods: 6,
  shortenedRods: 20,
  safetyRods: 8,

  thermalPower: 1500,
  neutronFlux: INITIAL_NEUTRON_FLUX,
  delayedNeutronPrecursors: createEquilibriumDelayedNeutronPrecursors(INITIAL_NEUTRON_FLUX),
  iodineConcentration: 0.35,
  xenonConcentration: 0.05,  // niedrig — Xenon bei hoher Leistung abgebrannt
  coolantTemperature: PHYSICS.COOLANT_TEMP_NOMINAL,
  // Equilibrium fuel temp at 1500MW with 8 pumps:
  // 270 + (2800-270) * (1500/3200) / 1.0 ≈ 1455°C
  fuelTemperature: 950,
  fuelSurfaceTemperature: 780,
  claddingTemperature: 310,
  steamPressure: PHYSICS.STEAM_PRESSURE_NOMINAL,
  steamVoidFraction: 0,
  coreTemperatureZones: [
    950 * 0.98,
    950 * 1.04,
    950 * 0.96,
    950 * 1.02,
  ],

  // Turbine (Turbogenerator 8 läuft für den Test)
  turbineConnected: true,
  turbineValveOpen: 80,
  turbineSpeed: 2900,
  generatorOutput: 400,

  // Trommelabscheider
  drumSeparatorLevel: 50,
  feedWaterFlow: PHYSICS.FEED_WATER_NOMINAL,

  // Leistungsregelung — Ziel: 700 MW ("Golden Zone")
  powerMode: 'manual',
  powerSetpoint: 700,

  // OZR — anfangs gesund, aber nicht durch ein unrealistisch grosses AZ-Bucket blockiert
  reactivityMargin: 145,

  // BAZ (historisch: war deaktiviert/blockiert durch Bediener)
  bazArmed: false,
  bazTriggered: false,

  isRunning: false,
  isExploded: false,
  testCompleted: false,
  elapsedSeconds: 0,
  score: PHYSICS.BASE_SCORE,
  events: [],

  targetPower: 700,
  xenonBuildupRate: 0,
  lastPowerLevel: 1500,

  az5Active: false,
  az5Timer: 0,
  az5PrePower: 0,
  az5PreMargin: 0,
  az5PreVoid: 0,
  pumpStates: [true, true, true, true, true, true, true, true],
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
        reactivityMargin: Math.max(0, Math.min(PHYSICS.MAX_CONTROL_RODS, action.payload)),
      };

    case 'SET_MANUAL_RODS': {
      const mr = Math.max(0, Math.min(PHYSICS.MANUAL_RODS_MAX, action.payload));
      const total = mr + state.autoRods + state.shortenedRods + state.safetyRods;
      return {
        ...state,
        manualRods: mr,
        controlRods: Math.min(PHYSICS.MAX_CONTROL_RODS, total),
        reactivityMargin: Math.min(PHYSICS.MAX_CONTROL_RODS, total),
      };
    }

    case 'SET_AUTO_RODS': {
      const ar = Math.max(0, Math.min(PHYSICS.AUTO_RODS_MAX, action.payload));
      const total = state.manualRods + ar + state.shortenedRods + state.safetyRods;
      return {
        ...state,
        autoRods: ar,
        controlRods: Math.min(PHYSICS.MAX_CONTROL_RODS, total),
        reactivityMargin: Math.min(PHYSICS.MAX_CONTROL_RODS, total),
      };
    }

    case 'SET_SHORTENED_RODS': {
      const usp = Math.max(0, Math.min(PHYSICS.SHORTENED_RODS_MAX, action.payload));
      const total = state.manualRods + state.autoRods + usp + state.safetyRods;
      return {
        ...state,
        shortenedRods: usp,
        controlRods: Math.min(PHYSICS.MAX_CONTROL_RODS, total),
        reactivityMargin: Math.min(PHYSICS.MAX_CONTROL_RODS, total),
      };
    }

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

    case 'TOGGLE_BAZ':
      return { ...state, bazArmed: !state.bazArmed };

    case 'TRIGGER_BAZ':
      return { ...state, ...triggerBAZ(state) };

    case 'TOGGLE_TURBINE':
      return { ...state, turbineConnected: !state.turbineConnected };

    case 'SET_TURBINE_VALVE':
      return {
        ...state,
        turbineValveOpen: Math.max(0, Math.min(100, action.payload)),
      };

    case 'SET_FEED_WATER':
      return {
        ...state,
        feedWaterFlow: Math.max(0, Math.min(1000, action.payload)),
      };

    case 'SET_POWER_MODE':
      return { ...state, powerMode: action.payload };

    case 'SET_POWER_SETPOINT':
      return {
        ...state,
        powerSetpoint: Math.max(0, Math.min(PHYSICS.MAX_THERMAL_POWER, action.payload)),
      };

    case 'START_GAME':
      return { ...INITIAL_STATE, isRunning: true };

    case 'RESET_GAME':
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}
