export const PHYSICS = {
  // Leistungsparameter — historischer Start ca. 8 Minuten vor der Explosion.
  // MAX_THERMAL_POWER ist die maximal zulaessige Dauerleistung; NOMINAL_POWER ist
  // der Auslegungspunkt. Sie sind absichtlich entkoppelt, damit Kuehlmittel- und
  // Druckverlaeufe (~MAX) nicht am Auslegungspunkt (~NOMINAL) gesaettigt werden.
  MAX_THERMAL_POWER: 4000,
  NOMINAL_POWER: 3200,
  DECAY_HEAT_FLOOR: 16,
  TEST_POWER_TARGET: 700,           // Geplanter TG-8-Testbereich vor dem Xenon-Leistungsabfall
  TEST_POWER_TOLERANCE: 50,         // Spielbarer Haltekorridor um den 700-MW-Zustand
  TEST_POWER_MIN: 650,              // Untere Grenze des Haltekorridors
  TEST_POWER_MAX: 750,              // Obere Grenze des Haltekorridors
  DANGER_POWER_LEVEL: 200,          // Tiefes Xenon-Pit-Niveau nach fehlgeschlagener Stabilisierung
  XENON_STALL_POWER: 30,            // Leistungsboden bei schwerer Xenon-Vergiftung
  TEST_DURATION_SECONDS: 480,
  HISTORICAL_START_CLOCK: "01:15:47",
  HISTORICAL_AZ5_CLOCK: "01:23:40",
  HISTORICAL_EXPLOSION_CLOCK: "01:23:47",

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
  // Die Session startet bereits im vergifteten Testzustand. Iod/Xenon laufen in
  // Echtzeit; die vorangegangenen Stunden stecken im Initialzustand.
  POISON_TIME_SCALE: 1,

  // Reaktivitätsbeiträge (delta-k/k)
  // BASE_EXCESS_REACTIVITY enthält die Xe-Kompensation, ist aber auf den realen
  // Startzustand kalibriert: ~700 MW, Xe≈1,45 und OZR≈31 Stabäquivalente.
  BASE_EXCESS_REACTIVITY: 0.041,
  TOTAL_ROD_WORTH: 0.036,
  DOPPLER_COEFFICIENT: -0.000011,
  COOLANT_DENSITY_COEFFICIENT: -0.00003,
  XENON_LOW_POWER_REACTIVITY_DRAG: 0.020,

  // Steuerstäbe
  MAX_CONTROL_RODS: 211,
  MINIMUM_SAFE_RODS: 15,
  RODS_PER_POWER_PERCENT: 2.11,

  // Stabgruppen
  MANUAL_RODS_MAX: 143,
  AUTO_RODS_MAX: 12,
  SHORTENED_RODS_MAX: 32,
  SAFETY_RODS_MAX: 24,

  // Xenon / Iod-135 — gekoppelte ODE in NORMALISIERTEN Einheiten:
  //   Iod- und Xenon-Konzentration werden so skaliert, dass das Gleichgewicht
  //   bei Vollast (Fluss = 1) genau 1.0 ergibt. Damit ist „Xenon = 1" das normale
  //   Betriebsgift; der Unfallstart liegt bei ca. 1,4–1,5, weil Burnup nach dem
  //   Leistungsabfall fast wegfiel, Iod-135 aber weiter zu Xenon-135 zerfiel.
  // Yields sind so kalibriert, dass Σ_in / Σ_out = 1 bei φ = 1, I = 1.
  // Reaktivitätsverlust pro Einheit normalisierter Xenon-Konzentration.
  // BASE_EXCESS_REACTIVITY enthält den Xe=1-Gleichgewichtsverlust bereits als
  // kritischen Referenzoffset, sodass Normal-Xenon den Startzustand nicht abwürgt.
  XENON_EQUILIBRIUM_CONCENTRATION: 1.0,
  XENON_MAX_REACTIVITY_PENALTY: 0.025,
  // Maximale physikalische Xenon-Überhöhung über Gleichgewicht (Pit ≈ 2,5–3×).
  XENON_PIT_CAP: 3.5,
  XENON_WARNING_CONCENTRATION: 1.35,
  XENON_SEVERE_CONCENTRATION: 2.5,
  IODINE_DECAY_CONSTANT: Math.LN2 / (6.57 * 3600),    // λ_I  ≈ 2,93·10⁻⁵ /s
  XENON_DECAY_CONSTANT: Math.LN2 / (9.14 * 3600),     // λ_Xe ≈ 2,11·10⁻⁵ /s
  // I-Yield in normalisierten Einheiten: γ_I = λ_I → I_eq(φ=1) = 1.
  IODINE_YIELD_COEFFICIENT: Math.LN2 / (6.57 * 3600),
  // Xe-135 entsteht überwiegend aus I-135-Zerfall; direkte Spaltausbeute ist klein.
  // Bei Vollast: direkte Quelle ≈5 %, Iod-Zerfall ≈95 % des Xe-Quellterms.
  XENON_DIRECT_YIELD_COEFFICIENT: 1.41e-5,
  XENON_IODINE_YIELD_COEFFICIENT: 2.67e-4,
  // σ·φ bei Vollast — realistischer Wert ~2,6·10⁻⁴ /s (σ_Xe ≈ 2,6·10⁶ b, φ ≈ 10¹⁴).
  XENON_BURNUP_COEFFICIENT: 2.6e-4,

  // Kühlmittel
  // 270°C = Kaltseite (Basis). Bei 1500 MWth berechnet sich 284°C (Referenz-Eintritt).
  // Siedepunkt 286°C bei 6,4 MPa → 2°C Marge bei ~1500 MWth.
  COOLANT_TEMP_NOMINAL: 270,
  COOLANT_TEMP_BOILING: 286,
  COOLANT_FLOW_NOMINAL: 7000,
  COOLANT_FLOW_PER_PUMP: 875,
  // Pumpendynamik — ГЦН‑317 hat ~6 t Schwungrad und läuft nach Stromverlust ~45 s aus.
  // Mit exponentieller Annäherung entspricht τ≈22 s einem Auslauf auf ~10 % Drehzahl
  // nach 45 s — der Lückenschluss, den der Turbinen-Auslauftest demonstrieren sollte.
  PUMP_COASTDOWN_TAU: 22,           // Zeitkonstante für den Auslauf nach Stromverlust [s]
  PUMP_SPINUP_TAU: 4,               // Zeitkonstante für den Anlauf nach Einschaltung [s]
  PUMP_ACTIVE_THRESHOLD: 0.2,       // Drehzahlanteil, ab dem eine Pumpe als „AKTIV" zählt
  // Vier von acht ГЦН waren beim Auslauftest am Reservebus, der vom auslaufenden TG-8 versorgt wurde.
  PUMP_RUNDOWN_BUS_INDICES: [2, 3, 6, 7] as const,
  PUMP_LEFT_LOOP_INDICES: [0, 1, 2, 3] as const,
  PUMP_RIGHT_LOOP_INDICES: [4, 5, 6, 7] as const,
  COOLANT_TEMP_RESPONSE: 0.12,      // Trägheit der Massenströmung im Primärkreis
  VOID_RESPONSE: 0.2,               // Dampfblasen kollabieren/entstehen nicht instantan
  COOLANT_HEATUP_RANGE: 42.5,
  COOLANT_TIME_CONSTANT: 4.5,
  // Dampfblasen entstehen bei einem Loss-of-Flow innerhalb von ~1-2 s, nicht 5 s.
  VOID_TIME_CONSTANT: 1.0,
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
  PRESSURE_POWER_GAIN: 17.5,
  PRESSURE_COOLING_GAIN: 7,

  // Positiver Dampfblasenkoeffizient (RBMK-Konstruktionsfehler, +4,5 bis +5,0 β).
  // 0,030 entspricht ~4,6 β bei beta=0,0065 — am oberen Ende der RBMK-1000-Spanne.
  VOID_COEFFICIENT: 0.030,
  VOID_FORMATION_RANGE: 30,          // °C über Siedepunkt für vollen Dampfblasenanteil
  LOW_POWER_VOID_AMPLIFICATION: 3,   // Verstärkung des Void-Koeffizienten bei niedriger Leistung
  // Bei reduziertem Kühlmitteldurchfluss steigt die Enthalpie pro Kanal stark an,
  // sodass die oberen Kanalabschnitte sieden, lange bevor die mittlere Kühlmittel-
  // temperatur die Sättigung erreicht. Das Bulk-Modell unterschätzt diesen Effekt –
  // diese Verstärkung bildet das Kanal-Austritts-Sieden bei Pumpenausfall ab.
  FLOW_INDUCED_VOID_GAIN: 0.82,
  // Bei stark reduziertem/ausgefallenem Durchfluss kochen einzelne Kanäle auch
  // bei niedriger gemittelter Leistung: Restwärme + fast stehendes Wasser reicht,
  // um lokale Dampfblasen zu bilden. Das ist die loss-of-flow-Rückkopplung, die
  // den RBMK bei Pumpenverlust nicht inert bleiben lässt.
  LOSS_OF_FLOW_VOID_GAIN: 0.62,
  LOSS_OF_FLOW_VOID_EXPONENT: 1.7,

  // AZ-5 Graphit-Spitzen-Effekt: im Unfallpfad baut sich der Leistungsanstieg
  // ueber das AZ-5/Explosionsfenster auf, statt sofort im ersten Tick zu springen.
  AZ5_GRAPHIT_SPIKE_DURATION: 9,
  AZ5_GRAPHITE_REACTIVITY_RAMP_EXPONENT: 1.8,
  AZ5_EXCURSION_POWER_RAMP_EXPONENT: 3,
  AZ5_GRAPHIT_POWER_MULTIPLIER: 2.5,
  AZ5_LOW_ORM_MULTIPLIER: 5.0,      // Verstärkter Spike wenn ORM < 15 ("un-trippable")
  AZ5_GRAPHITE_BASE_REACTIVITY: 0.012,
  AZ5_GRAPHITE_LOW_ORM_REACTIVITY: 0.02,
  AZ5_DIRECT_VOID_GAIN: 0.42,
  AZ5_XENON_BYPASS_FRACTION: 0.95,
  AZ5_XENON_POWER_THRESHOLD_GAIN: 1.25,
  AZ5_EXPLOSION_DELAY_SECONDS: 9,
  AZ5_PROMPT_FUEL_HEATING_GAIN: 8,
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
  PEAK_EXCURSION_POWER: 33000,       // Historische Maximalanzeige/Spitzenleistung (~33.000 MWth)

  // Kavitation
  CAVITATION_SUBCOOLING_THRESHOLD: 3, // °C Unterkühlung unter der Kavitation beginnt
  CAVITATION_FLOW_PENALTY: 0.85,      // Durchfluss-Multiplikator bei Kavitation
  // Kuehlmitteluntergrenze — bei totalem Pumpenausfall verschwindet die Waermeabfuhr
  // praktisch vollstaendig, sodass selbst Nachzerfallswaerme das Brennelement aufschmilzt
  // (TMI-/LOCA-Szenario, hier auf Spielzeit komprimiert).
  EFFECTIVE_COOLING_FLOOR: 0.002,
  EFFECTIVE_COOLING_LOCA_THRESHOLD: 0.05, // unterhalb dieses Niveaus dominiert Restwaerme
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
  SCORE_PENALTY_PER_SECOND_OFF_TARGET: 10,
  SCORE_PENALTY_PER_ALARM: 200,
  SCORE_PENALTY_PER_CRITICAL: 75,
  SCORE_BONUS_TEST_SUCCESS: 3000,
  SCORE_BONUS_ECCS_DISABLED: 500,
  SCORE_BONUS_STABLE_LOW_POWER: 1500, // Bonus fuer stabile Leistung im Testbereich
  SCORE_BONUS_DANGER_ZONE: 0,        // Tiefes Xenon-Pit-Niveau ist Unfallfalle, kein Bonus

  // Tick-Rate
  TICK_INTERVAL_MS: 500,
};
