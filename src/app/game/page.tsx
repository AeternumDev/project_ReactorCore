'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactorCockpit from '@/components/cockpit/ReactorCockpit';
import { PHYSICS } from '@/lib/physics/constants';

type GamePhase = 'briefing' | 'playing';

const BRIEFING_TEXT = [
  `Startzeit ist ${PHYSICS.HISTORICAL_START_CLOCK}: etwa acht Minuten vor der Explosion. Der Reaktor ist bereits auf rund ${PHYSICS.TEST_POWER_TARGET} MW gefallen und wurde nach dem fast vollständigen Leistungsabsturz wieder hochgezogen.`,
  'Die Xenon-Vergiftung ist nicht mehr ein zukünftiges Ereignis, sondern Anfangsbedingung. Iod-135 ist nach der langen Leistungsabsenkung reduziert, Xenon-135 liegt hoch, und der operative Reaktivitätsvorrat befindet sich nur noch im Warnbereich.',
  'SAOR/ECCS ist für den Test isoliert und die relevante Schutzblockierung ist gesetzt. Diese Anzeigen sind historische Testkonfigurationen; akut gefährlich wird der Zustand erst, wenn OZR, Void, Kühlfluss oder Leistung weiter entgleisen.',
];

const CONTROL_TABLE = [
  { element: 'Steuerstäbe', beschreibung: `Absorbieren Neutronen. Weniger Stäbe = mehr Leistung. OZR-Minimum: ${PHYSICS.OZR_MINIMUM_SAFE} Stabäquivalente.`, typ: 'Slider' },
  { element: 'Kühlmittelpumpen', beschreibung: '8 Hauptkreislaufpumpen. Mehr Pumpen = bessere Kühlung.', typ: 'Toggle' },
  { element: 'ECCS', beschreibung: 'Notkühlsystem. Wurde vor dem Test abgeschaltet (historisch).', typ: 'Schalter' },
  { element: 'AZ-5', beschreibung: `Notabschalter. Historisch um ${PHYSICS.HISTORICAL_AZ5_CLOCK} gedrückt; bei niedrigem OZR und Void entsteht zuerst positive Reaktivität.`, typ: 'Button' },
];

export default function GamePage() {
  const [phase, setPhase] = useState<GamePhase>('briefing');
  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    if (phase !== 'briefing') return;
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const startNow = useCallback(() => {
    setPhase('playing');
  }, []);

  if (phase === 'playing' || countdown <= 0) {
    return <ReactorCockpit />;
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--amber)',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '1.6rem',
          letterSpacing: '3px',
          marginBottom: '32px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
        }}
      >
        OPERATOREN-BRIEFING | SCHICHT: NACHT | DATUM: 26.04.1986 | ZEIT: {PHYSICS.HISTORICAL_START_CLOCK}
      </h1>

      {/* Two columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
          flex: 1,
        }}
      >
        {/* Left: Historical context */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '1rem',
              color: 'var(--warning-yellow)',
              marginBottom: '16px',
            }}
          >
            HISTORISCHER KONTEXT
          </h2>
          {BRIEFING_TEXT.map((text, i) => (
            <p
              key={i}
              style={{
                fontSize: '0.9rem',
                lineHeight: '1.7',
                color: '#aaa',
                marginBottom: '16px',
              }}
            >
              {text}
            </p>
          ))}
        </div>

        {/* Right: Control explanation table */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '1rem',
              color: 'var(--warning-yellow)',
              marginBottom: '16px',
            }}
          >
            STEUERFELD-ÜBERSICHT
          </h2>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.8rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--amber)' }}>ELEMENT</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--amber)' }}>TYP</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--amber)' }}>BESCHREIBUNG</th>
              </tr>
            </thead>
            <tbody>
              {CONTROL_TABLE.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', color: 'var(--safe-green)' }}>{row.element}</td>
                  <td style={{ padding: '8px', color: '#888' }}>{row.typ}</td>
                  <td style={{ padding: '8px', color: '#aaa' }}>{row.beschreibung}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time / physics-model disclosure */}
      <section
        style={{
          marginTop: '32px',
          padding: '16px 20px',
          border: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '1rem',
            color: 'var(--warning-yellow)',
            marginBottom: '12px',
          }}
        >
          ECHTZEIT-AUSSCHNITT &amp; PHYSIK-MODELL
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            fontSize: '0.85rem',
            lineHeight: '1.6',
            color: '#aaa',
          }}
        >
          <div>
            <p style={{ color: 'var(--amber)', marginBottom: '8px' }}>
              SIMULATION (Echtzeitfenster)
            </p>
            <ul style={{ paddingLeft: '18px', margin: 0 }}>
              <li>Spielzeit: <strong style={{ color: 'var(--safe-green)' }}>8 Minuten</strong> von {PHYSICS.HISTORICAL_START_CLOCK} bis {PHYSICS.HISTORICAL_EXPLOSION_CLOCK}.</li>
              <li>
                Iod-/Xenon-Dynamik läuft <strong style={{ color: 'var(--safe-green)' }}>in Echtzeit</strong>{' '}
                (POISON_TIME_SCALE = {PHYSICS.POISON_TIME_SCALE}). Die langen Vorstunden sind in den Startwerten enthalten.
              </li>
              <li>
                AZ-5 fährt Stäbe in <strong style={{ color: 'var(--safe-green)' }}>18 s</strong> ein
                (≈ 0,4 m/s, historisch korrekt). Der Graphit-Spitzen-Effekt entfaltet sich in den
                ersten ~5 s.
              </li>
              <li>
                Punktkinetik mit 6 verzögerten Neutronengruppen, 240 Substeps pro Tick — schneller
                Excursionsverlauf bleibt physikalisch aufgelöst.
              </li>
            </ul>
          </div>
          <div>
            <p style={{ color: 'var(--amber)', marginBottom: '8px' }}>
              REALITÄT TSCHERNOBYL (25./26.04.1986)
            </p>
            <ul style={{ paddingLeft: '18px', margin: 0 }}>
              <li>
                Leistungsabsenkung von 3200 → ~1600 MW, lange Haltephase wegen Lastverteiler,
                danach weiterer Abfall bis fast Null und Wiederanfahren auf ~200 MW.
              </li>
              <li>
                Xenon-135 war im Niedrigleistungszustand stark wirksam; die Operatoren zogen
                zahlreiche Stäbe, wodurch der OZR in den Warn- und später Unfallbereich fiel.
              </li>
              <li>
                Stabilisierungsversuch 01:00–01:23 → AZ-5 um{' '}
                <strong style={{ color: 'var(--alarm-red)' }}>01:23:40</strong>, Explosion um{' '}
                <strong style={{ color: 'var(--alarm-red)' }}>01:23:47</strong> — der prompte
                Excursionsverlauf dauerte nur <strong>~4 Sekunden</strong>.
              </li>
              <li>
                Spitzenleistung &gt; 30 GWth, Brennstoff &gt; 3000 °C, Zr-Cladding-Reaktion ab
                1200 °C → Wasserstoffexplosion.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Countdown + Start button */}
      <div
        style={{
          marginTop: '32px',
          borderTop: '1px solid var(--border)',
          paddingTop: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
        }}
      >
        <div
          className="animate-blink"
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '1.4rem',
            color: 'var(--warning-yellow)',
          }}
        >
          SIMULATION STARTET IN: {countdown}
        </div>
        <button
          className="btn-industrial glow-amber"
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '1rem',
          }}
          onClick={startNow}
        >
          [ SOFORT STARTEN ]
        </button>
      </div>
    </main>
  );
}
