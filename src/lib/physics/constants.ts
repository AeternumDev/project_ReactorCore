export const PHYSICS = {
  // Leistungsparameter — Zielleistung 700 MW ("Golden Zone")
  MAX_THERMAL_POWER: 3200,
  NOMINAL_POWER: 3200,
  TEST_POWER_TARGET: 700,           // Ziel: 700 MW thermisch ("Golden Zone")
  TEST_POWER_MIN: 700,              // Untere Grenze des Stabilisierungsbands
  TEST_POWER_MAX: 1000,             // Obere Grenze des Stabilisierungsbands
  DANGER_POWER_LEVEL: 200,          // Katastrophenniveau — hohe Effizienz, hohe Gefahr
  XENON_STALL_POWER: 30,            // Leistungsboden bei schwerer Xenon-Vergiftung
  TEST_DURATION_SECONDS: 480,

  // Steuerstäbe
  MAX_CONTROL_RODS: 211,
  MINIMUM_SAFE_RODS: 15,
  RODS_PER_POWER_PERCENT: 2.11,

  // Stabgruppen
  MANUAL_RODS_MAX: 30,
  AUTO_RODS_MAX: 12,
  SHORTENED_RODS_MAX: 24,
  SAFETY_RODS_MAX: 145,

  // Xenon — verschärfte Dynamik: unter 700 MW baut sich Xenon-135 aggressiv auf
  XENON_BUILD_DELAY: 30,            // Sekunden bis Xenon-Aufbau nach Leistungsabfall
  XENON_DECAY_RATE: 0.0015,         // Abbaurate bei hoher Leistung
  XENON_BUILD_RATE: 0.003,          // Aufbaurate unter 700 MW (verschärft)
  XENON_MAX_REACTIVITY_PENALTY: 0.35, // Max Reaktivitätsstrafe bei Xenon-Vergiftung

  // Kühlmittel
  COOLANT_TEMP_NOMINAL: 270,
  COOLANT_TEMP_BOILING: 284,
  COOLANT_FLOW_NOMINAL: 7000,
  COOLANT_FLOW_PER_PUMP: 875,

  // Temperaturgrenzen
  FUEL_TEMP_NOMINAL: 650,
  FUEL_TEMP_WARNING: 1200,
  FUEL_TEMP_MELTDOWN: 2800,
  CORE_TEMP_WARNING: 350,
  CORE_TEMP_CRITICAL: 500,

  // Druck
  STEAM_PRESSURE_NOMINAL: 65,
  STEAM_PRESSURE_WARNING: 80,
  STEAM_PRESSURE_CRITICAL: 95,

  // Positiver Dampfblasenkoeffizient (RBMK-Konstruktionsfehler)
  VOID_COEFFICIENT: 0.0015,

  // AZ-5 Graphit-Spitzen-Effekt (5 Sekunden — "Point of No Return")
  AZ5_GRAPHIT_SPIKE_DURATION: 5,
  AZ5_GRAPHIT_POWER_MULTIPLIER: 2.5,
  AZ5_LOW_ORM_MULTIPLIER: 5.0,      // Verstärkter Spike wenn ORM < 15 ("un-trippable")

  // BAZ — Schnelle Notabschaltung
  BAZ_POWER_THRESHOLD: 1.1,        // 110% des Sollwerts
  BAZ_PRESSURE_THRESHOLD: 88,      // bar
  BAZ_COOLANT_FLOW_MIN: 2000,      // L/s Mindestdurchfluss

  // Turbine
  TURBINE_NOMINAL_SPEED: 3000,     // RPM
  TURBINE_MAX_SPEED: 3600,         // RPM (Überdrehzahl)
  TURBINE_EFFICIENCY: 0.33,        // 33% thermisch → elektrisch
  TURBINE_SPINDOWN_RATE: 50,       // RPM/s Auslauf

  // Trommelabscheider
  DRUM_LEVEL_NOMINAL: 50,          // %
  DRUM_LEVEL_LOW: 20,              // %
  DRUM_LEVEL_HIGH: 80,             // %
  FEED_WATER_NOMINAL: 500,         // L/s

  // OZR (Operativer Reaktivitätsvorrat)
  OZR_MINIMUM_SAFE: 15,            // Stabäquivalente
  OZR_WARNING: 30,                 // Stabäquivalente

  // Score
  BASE_SCORE: 10000,
  SCORE_PENALTY_PER_SECOND_OFF_TARGET: 5,
  SCORE_PENALTY_PER_ALARM: 200,
  SCORE_BONUS_TEST_SUCCESS: 3000,
  SCORE_BONUS_ECCS_DISABLED: 500,
  SCORE_BONUS_STABLE_LOW_POWER: 1500, // Bonus für stabile Leistung im 700–1000 MW Zielband
  SCORE_BONUS_DANGER_ZONE: 20,       // Risiko-Bonus pro Tick bei ~200 MW (hohe Effizienz, hohe Gefahr)

  // Tick-Rate
  TICK_INTERVAL_MS: 500,
};
