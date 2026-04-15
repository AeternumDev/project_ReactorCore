export const PHYSICS = {
  // Leistungsparameter — Zielleistung 700 MW ("Golden Zone")
  MAX_THERMAL_POWER: 3200,
  NOMINAL_POWER: 3200,
  DECAY_HEAT_FLOOR: 16,
  TEST_POWER_TARGET: 700,           // Ziel: 700 MW thermisch ("Golden Zone")
  TEST_POWER_MIN: 700,              // Untere Grenze des Stabilisierungsbands
  TEST_POWER_MAX: 1000,             // Obere Grenze des Stabilisierungsbands
  DANGER_POWER_LEVEL: 200,          // Katastrophenniveau — hohe Effizienz, hohe Gefahr
  XENON_STALL_POWER: 30,            // Leistungsboden bei schwerer Xenon-Vergiftung
  TEST_DURATION_SECONDS: 480,

  // Punktkinetik (browser-tauglich, aber physikalisch deutlich naeher an echten Reaktormodellen)
  KINETICS_SUBSTEPS: 240,
  PROMPT_NEUTRON_LIFETIME: 0.0007,
  DELAYED_NEUTRON_GROUPS: [
    { beta: 0.000215, lambda: 0.0124 },
    { beta: 0.001424, lambda: 0.0305 },
    { beta: 0.001274, lambda: 0.111 },
    { beta: 0.002568, lambda: 0.301 },
    { beta: 0.000748, lambda: 1.14 },
    { beta: 0.000273, lambda: 3.01 },
  ] as const,
  TOTAL_DELAYED_NEUTRON_FRACTION: 0.006502,
  POISON_TIME_SCALE: 60,

  // Reaktivitaetsbeitraege (delta-k/k)
  BASE_EXCESS_REACTIVITY: 0.0275,
  TOTAL_ROD_WORTH: 0.036,
  DOPPLER_COEFFICIENT: -0.000011,
  COOLANT_DENSITY_COEFFICIENT: -0.00003,

  // Steuerstäbe
  MAX_CONTROL_RODS: 211,
  MINIMUM_SAFE_RODS: 15,
  RODS_PER_POWER_PERCENT: 2.11,

  // Stabgruppen
  MANUAL_RODS_MAX: 143,
  AUTO_RODS_MAX: 12,
  SHORTENED_RODS_MAX: 32,
  SAFETY_RODS_MAX: 24,

  // Xenon / Iod-135 — echte gekoppelte ODE-Struktur, aber auf spielbare Zeit komprimiert
  XENON_BUILD_DELAY: 30,
  XENON_DECAY_RATE: 0.0015,
  XENON_BUILD_RATE: 0.003,
  XENON_MAX_REACTIVITY_PENALTY: 0.05,
  IODINE_DECAY_CONSTANT: Math.LN2 / (6.57 * 3600),
  XENON_DECAY_CONSTANT: Math.LN2 / (9.14 * 3600),
  IODINE_YIELD_COEFFICIENT: 0.00028,
  XENON_DIRECT_YIELD_COEFFICIENT: 0.00005,
  XENON_BURNUP_COEFFICIENT: 0.00015,

  // Kühlmittel
  // 270°C = Kaltseite (Basis). Bei 1500 MWth berechnet sich 284°C (Referenz-Eintritt).
  // Siedepunkt 286°C bei 6,4 MPa → 2°C Marge bei ~1500 MWth.
  COOLANT_TEMP_NOMINAL: 270,
  COOLANT_TEMP_BOILING: 286,
  COOLANT_FLOW_NOMINAL: 7000,
  COOLANT_FLOW_PER_PUMP: 875,
  COOLANT_TEMP_RESPONSE: 0.12,      // Trägheit der Massenströmung im Primärkreis
  VOID_RESPONSE: 0.2,               // Dampfblasen kollabieren/entstehen nicht instantan
  COOLANT_HEATUP_RANGE: 34,
  COOLANT_TIME_CONSTANT: 4.5,
  VOID_TIME_CONSTANT: 1.8,
  SATURATION_TEMPERATURE_OFFSET: 251,
  SATURATION_TEMPERATURE_SLOPE: 0.55,

  // Temperaturgrenzen
  FUEL_TEMP_NOMINAL: 650,
  FUEL_TEMP_WARNING: 1200,
  FUEL_TEMP_MELTDOWN: 2800,
  CORE_TEMP_WARNING: 350,
  CORE_TEMP_CRITICAL: 500,
  FUEL_SURFACE_RISE: 700,
  FUEL_CENTER_RISE: 620,
  CLADDING_RISE: 90,
  FUEL_CENTER_TIME_CONSTANT: 2.4,
  FUEL_SURFACE_TIME_CONSTANT: 1.4,
  CLADDING_TIME_CONSTANT: 0.7,

  // Druck
  STEAM_PRESSURE_NOMINAL: 65,
  STEAM_PRESSURE_WARNING: 80,
  STEAM_PRESSURE_CRITICAL: 95,
  PRESSURE_VOID_GAIN: 32,
  PRESSURE_POWER_GAIN: 14,
  PRESSURE_COOLING_GAIN: 7,

  // Positiver Dampfblasenkoeffizient (RBMK-Konstruktionsfehler, +4,5 bis +5,0 β)
  VOID_COEFFICIENT: 0.024,
  VOID_FORMATION_RANGE: 30,          // °C über Siedepunkt für vollen Dampfblasenanteil
  LOW_POWER_VOID_AMPLIFICATION: 3,   // Verstärkung des Void-Koeffizienten bei niedriger Leistung

  // AZ-5 Graphit-Spitzen-Effekt (5 Sekunden — "Point of No Return")
  AZ5_GRAPHIT_SPIKE_DURATION: 5,
  AZ5_GRAPHIT_POWER_MULTIPLIER: 2.5,
  AZ5_LOW_ORM_MULTIPLIER: 5.0,      // Verstärkter Spike wenn ORM < 15 ("un-trippable")
  AZ5_GRAPHITE_BASE_REACTIVITY: 0.0045,
  AZ5_GRAPHITE_LOW_ORM_REACTIVITY: 0.02,
  AZ5_GRAPHIT_POWER_THRESHOLD: 700,  // Unterhalb davon wird der Tip-Effekt relevant
  AZ5_GRAPHIT_MARGIN_THRESHOLD: 30,  // Niedrige OZR macht den positiven Scram gefaehrlich
  AZ5_GRAPHIT_VOID_THRESHOLD: 0.08,  // Bedeutende Void-Bildung im Kern vor AZ-5
  AZ5_PROMPT_REACTIVITY_THRESHOLD: 0.15, // Ab hier kippt der Transient in prompt-kritisches Verhalten
  AZ5_PROMPT_RESPONSE_GAIN: 0.45,    // Beschleunigte Fluxantwort bei positivem Scram
  AZ5_PROMPT_POWER_GAIN: 0.55,       // Wärmefreisetzung folgt Flux bei der Exkursion deutlich schneller
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
