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
  XENON_MAX_REACTIVITY_PENALTY: 0.9,  // Stark genug, um bei 200 MWth fast alle Stäbe zu erfordern

  // Kühlmittel
  // 270°C = Kaltseite (Basis). Bei 1500 MWth berechnet sich 284°C (Referenz-Eintritt).
  // Siedepunkt 286°C bei 6,4 MPa → 2°C Marge bei ~1500 MWth.
  COOLANT_TEMP_NOMINAL: 270,
  COOLANT_TEMP_BOILING: 286,
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

  // Positiver Dampfblasenkoeffizient (RBMK-Konstruktionsfehler, +4,5 bis +5,0 β)
  VOID_COEFFICIENT: 0.005,
  VOID_FORMATION_RANGE: 30,          // °C über Siedepunkt für vollen Dampfblasenanteil
  LOW_POWER_VOID_AMPLIFICATION: 3,   // Verstärkung des Void-Koeffizienten bei niedriger Leistung

  // AZ-5 Graphit-Spitzen-Effekt (5 Sekunden — "Point of No Return")
  AZ5_GRAPHIT_SPIKE_DURATION: 5,
  AZ5_GRAPHIT_POWER_MULTIPLIER: 2.5,
  AZ5_LOW_ORM_MULTIPLIER: 5.0,      // Verstärkter Spike wenn ORM < 15 ("un-trippable")
  AZ5_GRAPHIT_POWER_THRESHOLD: 700,  // Unterhalb davon wird der Tip-Effekt relevant
  AZ5_GRAPHIT_MARGIN_THRESHOLD: 30,  // Niedrige OZR macht den positiven Scram gefaehrlich
  AZ5_GRAPHIT_VOID_THRESHOLD: 0.08,  // Bedeutende Void-Bildung im Kern vor AZ-5
  AZ5_FULL_INSERTION_TIME: 18,       // Sekunden für vollständiges Einfahren (0,4 m/s)
  AZ5_ROD_INSERTION_RATE: 12,        // Stäbe pro Sekunde während AZ-5 (211/18 ≈ 12)

  // BAZ — Schnelle Notabschaltung
  BAZ_POWER_THRESHOLD: 1.1,        // 110% des Sollwerts
  BAZ_PRESSURE_THRESHOLD: 88,      // bar
  BAZ_COOLANT_FLOW_MIN: 2000,      // L/s Mindestdurchfluss

  // Turbine
  TURBINE_NOMINAL_SPEED: 3000,     // RPM
  TURBINE_MAX_SPEED: 3600,         // RPM (Überdrehzahl)
  TURBINE_EFFICIENCY: 0.33,        // 33% thermisch → elektrisch
  TURBINE_SPINDOWN_RATE: 50,       // RPM/s Auslauf
  // Leistungsexkursion
  PEAK_EXCURSION_POWER: 33000,       // Spitzenleistung bei Exkursion (>33.000 MWth Referenz)

  // Kavitation
  CAVITATION_SUBCOOLING_THRESHOLD: 3, // °C Unterkühlung unter der Kavitation beginnt
  CAVITATION_FLOW_PENALTY: 0.85,      // Durchfluss-Multiplikator bei Kavitation
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
