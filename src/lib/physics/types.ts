export interface ReactorState {
  // Steuerparameter (vom Spieler kontrollierbar)
  controlRods: number;
  activeCoolantPumps: number;
  eccsEnabled: boolean;
  coolantFlowRate: number;

  // Physikalische Zustandsgrößen (berechnet)
  thermalPower: number;
  neutronFlux: number;
  xenonConcentration: number;
  coolantTemperature: number;
  fuelTemperature: number;
  steamPressure: number;
  steamVoidFraction: number;
  coreTemperatureZones: [number, number, number, number];

  // Spielzustand
  isRunning: boolean;
  isExploded: boolean;
  testCompleted: boolean;
  elapsedSeconds: number;
  score: number;
  events: GameEvent[];

  // Interne Simulation
  targetPower: number;
  xenonBuildupRate: number;
  lastPowerLevel: number;

  // AZ-5 internes Tracking
  az5Active: boolean;
  az5Timer: number;
  az5PrePower: number;
  pumpStates: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
}

export interface GameEvent {
  timestamp: number;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'alarm';
}

export type GameAction =
  | { type: 'TICK' }
  | { type: 'SET_CONTROL_RODS'; payload: number }
  | { type: 'TOGGLE_PUMP'; payload: number }
  | { type: 'TOGGLE_ECCS' }
  | { type: 'SET_COOLANT_FLOW'; payload: number }
  | { type: 'TRIGGER_AZ5' }
  | { type: 'START_GAME' }
  | { type: 'RESET_GAME' };
