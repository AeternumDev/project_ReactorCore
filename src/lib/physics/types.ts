export interface ReactorState {
  // Steuerparameter (vom Spieler kontrollierbar)
  controlRods: number;
  activeCoolantPumps: number;
  eccsEnabled: boolean;
  coolantFlowRate: number;

  // Stabgruppen (detaillierte Steuerung)
  manualRods: number;       // MR — Manuelle Regelstäbe (0-30)
  autoRods: number;         // AR — Automatische Regelstäbe (0-12)
  shortenedRods: number;    // USP — Verkürzte Absorberstäbe (0-24)
  safetyRods: number;       // AZ — Sicherheitsstäbe (0-145)

  // Physikalische Zustandsgrößen (berechnet)
  thermalPower: number;
  neutronFlux: number;
  xenonConcentration: number;
  coolantTemperature: number;
  fuelTemperature: number;
  steamPressure: number;
  steamVoidFraction: number;
  coreTemperatureZones: [number, number, number, number];

  // Turbine und Generator
  turbineConnected: boolean;
  turbineValveOpen: number;   // 0-100 (%)
  turbineSpeed: number;       // RPM (nominal ~3000)
  generatorOutput: number;    // MW elektrisch

  // Trommelabscheider
  drumSeparatorLevel: number; // % Wasserstand (nominal ~50)
  feedWaterFlow: number;      // L/s

  // Leistungsregelung
  powerMode: 'manual' | 'auto';
  powerSetpoint: number;      // MW Zielleistung für Auto-Modus

  // Reaktivitätsmarge (OZR)
  reactivityMargin: number;   // Stabäquivalente

  // BAZ — Schnelle Notabschaltung
  bazArmed: boolean;
  bazTriggered: boolean;

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
  | { type: 'SET_MANUAL_RODS'; payload: number }
  | { type: 'SET_AUTO_RODS'; payload: number }
  | { type: 'SET_SHORTENED_RODS'; payload: number }
  | { type: 'TOGGLE_PUMP'; payload: number }
  | { type: 'TOGGLE_ECCS' }
  | { type: 'SET_COOLANT_FLOW'; payload: number }
  | { type: 'TRIGGER_AZ5' }
  | { type: 'TOGGLE_BAZ' }
  | { type: 'TRIGGER_BAZ' }
  | { type: 'TOGGLE_TURBINE' }
  | { type: 'SET_TURBINE_VALVE'; payload: number }
  | { type: 'SET_FEED_WATER'; payload: number }
  | { type: 'SET_POWER_MODE'; payload: 'manual' | 'auto' }
  | { type: 'SET_POWER_SETPOINT'; payload: number }
  | { type: 'START_GAME' }
  | { type: 'RESET_GAME' };
