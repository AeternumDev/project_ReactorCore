import { ReactorState, GameAction } from "@/lib/physics/types";
import {
  calculateNextState,
  createEquilibriumDelayedNeutronPrecursors,
  triggerAZ5,
  triggerBAZ,
} from "@/lib/physics/engine";
import { PHYSICS } from "@/lib/physics/constants";
import { calculateScore } from "./scoring";

const INITIAL_NEUTRON_FLUX = PHYSICS.TEST_POWER_TARGET / PHYSICS.NOMINAL_POWER;

export const INITIAL_STATE: ReactorState = {
  controlRods: 26,
  activeCoolantPumps: 8,
  eccsEnabled: false,
  coolantFlowRate: 8 * PHYSICS.COOLANT_FLOW_PER_PUMP,

  // Stabgruppen um 01:15:47: niedriger OZR, aber noch knapp oberhalb der
  // Sofortabschaltgrenze. Die letzten Minuten koennen den OZR in den Unfallbereich ziehen.
  manualRods: 14,
  autoRods: 4,
  shortenedRods: 4,
  safetyRods: 4,

  thermalPower: PHYSICS.TEST_POWER_TARGET,
  neutronFlux: INITIAL_NEUTRON_FLUX,
  delayedNeutronPrecursors: createEquilibriumDelayedNeutronPrecursors(INITIAL_NEUTRON_FLUX),
  // I/Xe in normalisierten Einheiten (1.0 = Gleichgewicht bei Vollast).
  // Die vorangegangene Leistungsabsenkung steckt im Initialzustand: Iod ist
  // bereits abgefallen, Xenon liegt deutlich über dem Niedrigleistungs-Gleichgewicht.
  iodineConcentration: 0.49,
  xenonConcentration: 1.45,
  coolantTemperature: PHYSICS.COOLANT_TEMP_NOMINAL,
  fuelTemperature: PHYSICS.FUEL_TEMP_NOMINAL,
  fuelSurfaceTemperature: 330,
  claddingTemperature: 285,
  steamPressure: PHYSICS.STEAM_PRESSURE_NOMINAL,
  steamVoidFraction: 0,
  coreTemperatureZones: [
    PHYSICS.FUEL_TEMP_NOMINAL * 0.98,
    PHYSICS.FUEL_TEMP_NOMINAL * 1.04,
    PHYSICS.FUEL_TEMP_NOMINAL * 0.96,
    PHYSICS.FUEL_TEMP_NOMINAL * 1.02,
  ],

  // Turbine (Turbogenerator 8 läuft noch; Auslauf beginnt erst beim Teststart)
  turbineConnected: true,
  turbineValveOpen: 80,
  turbineAuto: false,
  turbineSpeed: PHYSICS.TURBINE_NOMINAL_SPEED,
  generatorOutput: 52,

  // Trommelabscheider
  drumSeparatorLevel: 50,
  feedWaterFlow: PHYSICS.FEED_WATER_NOMINAL,
  feedWaterAuto: false,

  // Leistungsregelung — realer Zustand in den letzten Minuten: ca. 200 MW
  powerMode: 'manual',
  powerSetpoint: PHYSICS.TEST_POWER_TARGET,

  // OZR — niedriger historischer Warnbereich, aber noch nicht die 8-Stab-Endlage
  reactivityMargin: 26,

  // BAZ (historisch: war deaktiviert/blockiert durch Bediener)
  bazArmed: false,
  bazTriggered: false,

  isRunning: false,
  isExploded: false,
  testCompleted: false,
  elapsedSeconds: 0,
  score: PHYSICS.BASE_SCORE,
  events: [],

  targetPower: PHYSICS.TEST_POWER_TARGET,
  xenonBuildupRate: 0,
  lastPowerLevel: PHYSICS.TEST_POWER_TARGET,

  az5Active: false,
  az5Timer: 0,
  az5PrePower: 0,
  az5PreMargin: 0,
  az5PreVoid: 0,
  pumpStates: [true, true, true, true, true, true, true, true],
  pumpSpeeds: [1, 1, 1, 1, 1, 1, 1, 1],
  rundownBusActive: true,
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
      // activeCoolantPumps und coolantFlowRate werden jetzt von der Pumpendynamik
      // im Engine-Tick geführt (Auslauf/Anlauf mit Schwungrad-Trägheit).
      return {
        ...state,
        pumpStates: newPumpStates,
      };
    }

    case 'TOGGLE_RUNDOWN_BUS':
      return { ...state, rundownBusActive: !state.rundownBusActive };

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

    case 'TOGGLE_TURBINE_AUTO':
      return { ...state, turbineAuto: !state.turbineAuto };

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

    case 'TOGGLE_FEED_WATER_AUTO':
      return { ...state, feedWaterAuto: !state.feedWaterAuto };

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
