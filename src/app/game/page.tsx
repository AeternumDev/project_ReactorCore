'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactorCockpit from '@/components/cockpit/ReactorCockpit';

type GamePhase = 'briefing' | 'playing';

const BRIEFING_TEXT = [
  'Am 25. April 1986 sollte am Reaktor 4 des Kernkraftwerks Tschernobyl ein Sicherheitstest durchgeführt werden. Ziel war es zu prüfen, ob die Turbinen bei einem Stromausfall genügend Energie liefern können, um die Kühlmittelpumpen bis zum Anspringen der Notstromdiesel zu betreiben.',
  'Der Test war ursprünglich für den Nachmittag geplant, wurde aber auf Anweisung des Lastverteilers in Kiew auf die Nachtschicht verschoben. Die neue Mannschaft war mit dem Testverfahren weniger vertraut.',
  'Während der Leistungsabsenkung fiel die Reaktorleistung aufgrund von Xenon-Vergiftung auf nahezu Null. Um den Test dennoch durchzuführen, wurden die Steuerstäbe weit über das sichere Minimum hinaus gezogen — ein fataler Fehler.',
];

const CONTROL_TABLE = [
  { element: 'Steuerstäbe', beschreibung: 'Absorbieren Neutronen. Weniger Stäbe = mehr Leistung. Minimum: 15 eingefahren!', typ: 'Slider' },
  { element: 'Kühlmittelpumpen', beschreibung: '8 Hauptkreislaufpumpen. Mehr Pumpen = bessere Kühlung.', typ: 'Toggle' },
  { element: 'ECCS', beschreibung: 'Notkühlsystem. Wurde vor dem Test abgeschaltet (historisch).', typ: 'Schalter' },
  { element: 'AZ-5', beschreibung: 'Notabschalter. Fährt alle Stäbe ein — aber Graphitspitzen verursachen erst einen Leistungsspike!', typ: 'Button' },
];

export default function GamePage() {
  const [phase, setPhase] = useState<GamePhase>('briefing');
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (phase !== 'briefing') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const startNow = useCallback(() => {
    setPhase('playing');
  }, []);

  if (phase === 'playing') {
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
        OPERATOREN-BRIEFING | SCHICHT: NACHT | DATUM: 25.04.1986
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
