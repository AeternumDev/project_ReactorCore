'use client';

import { useRouter } from 'next/navigation';
import { PHYSICS } from '@/lib/physics/constants';

export default function Home() {
  const router = useRouter();

  return (
    <main
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Reactor schematic background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
        <svg width="600" height="600" viewBox="0 0 600 600" fill="none">
          <circle cx="300" cy="300" r="250" stroke="var(--amber)" strokeWidth="1" />
          <circle cx="300" cy="300" r="200" stroke="var(--amber)" strokeWidth="0.5" />
          <circle cx="300" cy="300" r="150" stroke="var(--amber)" strokeWidth="0.5" />
          <circle cx="300" cy="300" r="100" stroke="var(--amber)" strokeWidth="1" />
          <circle cx="300" cy="300" r="50" stroke="var(--amber)" strokeWidth="0.5" />
          {/* Cross lines */}
          <line x1="50" y1="300" x2="550" y2="300" stroke="var(--amber)" strokeWidth="0.5" />
          <line x1="300" y1="50" x2="300" y2="550" stroke="var(--amber)" strokeWidth="0.5" />
          <line x1="123" y1="123" x2="477" y2="477" stroke="var(--amber)" strokeWidth="0.3" />
          <line x1="477" y1="123" x2="123" y2="477" stroke="var(--amber)" strokeWidth="0.3" />
          {/* Fuel channel dots */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const cx = Math.round((300 + Math.cos(angle) * 175) * 1e6) / 1e6;
            const cy = Math.round((300 + Math.sin(angle) * 175) * 1e6) / 1e6;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="4"
                fill="var(--amber)"
              />
            );
          })}
          {/* Control rod channels */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = ((i * 45 + 22.5) * Math.PI) / 180;
            const rcx = Math.round((300 + Math.cos(angle) * 130) * 1e6) / 1e6;
            const rcy = Math.round((300 + Math.sin(angle) * 130) * 1e6) / 1e6;
            return (
              <rect
                key={`rod-${i}`}
                x={rcx - 3}
                y={rcy - 10}
                width="6"
                height="20"
                fill="var(--amber)"
                transform={`rotate(${i * 45 + 22.5}, ${rcx}, ${rcy})`}
              />
            );
          })}
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center" style={{ maxWidth: '640px', padding: '0 24px' }}>
        <h1
          className="text-5xl tracking-wider mb-2"
          style={{ fontFamily: 'var(--font-share-tech-mono), monospace', color: 'var(--amber)' }}
        >
          ☢ REAKTORCORE
        </h1>
        <p
          className="text-sm tracking-widest mb-6 opacity-70"
          style={{ fontFamily: 'var(--font-share-tech-mono), monospace', color: 'var(--amber)' }}
        >
          TSCHERNOBYL-SIMULATION | 26. APRIL 1986 | START {PHYSICS.HISTORICAL_START_CLOCK ?? '01:15:47'}
        </p>

        {/* Procedural briefing */}
        <div
          className="text-left mb-8"
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.8rem',
            lineHeight: '1.6',
            color: '#aaa',
            border: '1px solid var(--border)',
            padding: '16px 20px',
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ color: 'var(--amber)', fontSize: '0.85rem', marginBottom: '10px', letterSpacing: '0.1em' }}>
            EINSATZBRIEFING — SICHERHEITSTEST Nr. 4
          </div>

          <p style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--warning-yellow)' }}>AUSGANGSLAGE:</span>{' '}
            Die Simulation beginnt im geplanten 700&nbsp;MW-Testbereich kurz vor dem Auslauftest.
            Die vorangegangene Leistungsabsenkung steckt schon im Kern: Xenon-135 ist hoch,
            Iod-135 fällt ab, und der OZR liegt nur knapp oberhalb des Warnbereichs.
          </p>

          <p style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--amber)' }}>ZIEL:</span>{' '}
            Versuche den Reaktor im Bereich von <strong style={{ color: '#fff' }}>{PHYSICS.TEST_POWER_MIN}–{PHYSICS.TEST_POWER_MAX}&nbsp;MW</strong>
            zu halten, während Xenon die Leistung nach unten zieht. TG-8 läuft noch; der Auslauf beginnt erst,
            wenn die Dampfzufuhr geschlossen und der Rundown-Bus auf TG-8 gelegt wird.
          </p>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--amber)' }}>ERSTE MASSNAHMEN:</span>
            <ol style={{ paddingLeft: '18px', marginTop: '4px' }}>
              <li>Leistung bei etwa {PHYSICS.TEST_POWER_TARGET}&nbsp;MW beobachten; der Xenon-Pit kann sie trotz Gegenmaßnahmen sinken lassen.</li>
              <li>OZR-Anzeige beobachten — <span style={{ color: 'var(--alarm-red)' }}>unter {PHYSICS.OZR_MINIMUM_SAFE} Stäben OZR: Abschaltgrenze.</span></li>
              <li>SAOR/ECCS und BAZ-Blockierung als historische Testkonfiguration erkennen, nicht als akute Startkatastrophe.</li>
              <li>Vor dem Auslauf TG-8, Speisewasser, Trommelstand und Kühlfluss prüfen.</li>
            </ol>
          </div>

          <p style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--alarm-red)' }}>WARNUNG (OZR):</span>{' '}
            Sinkt der OZR unter {PHYSICS.OZR_MINIMUM_SAFE}&nbsp;Stäbe, ist die Kontrolle über die Kettenreaktion
            nicht mehr gewährleistet. Die Vorschrift verlangt die sofortige Abschaltung.
          </p>

          <p>
            <span style={{ color: 'var(--safe-green)' }}>ERFOLG:</span>{' '}
            Acht Minuten Echtzeit ohne Leistungsdurchgang, Dampfblasen-Eskalation oder OZR-Verlust.
            Die historische Falle baut sich während der Bedienhandlungen auf; die Anzeigen zeigen, wie eng der Spielraum wird.
          </p>
        </div>

        <button
          className="btn-industrial text-lg tracking-widest glow-amber"
          style={{ fontFamily: 'var(--font-share-tech-mono), monospace', padding: '16px 48px' }}
          onClick={() => router.push('/game')}
        >
          [ SIMULATION STARTEN ]
        </button>
      </div>

      {/* Disclaimer */}
      <div
        className="absolute bottom-6 text-xs text-center px-4"
        style={{ color: '#444' }}
      >
        Historische Bildungssimulation. Keine realen Kernreaktoren wurden beim Erstellen dieser Anwendung beschädigt.
      </div>
    </main>
  );
}

