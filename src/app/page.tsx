'use client';

import { useRouter } from 'next/navigation';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  return (
    <main
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Auth button top-right */}
      <div className="absolute top-4 right-6 z-10">
        {isSignedIn ? (
          <UserButton />
        ) : (
          <SignInButton mode="modal">
            <button className="btn-industrial" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              ANMELDEN
            </button>
          </SignInButton>
        )}
      </div>

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
          TSCHERNOBYL-SIMULATION | 26. APRIL 1986 | 01:23 UHR
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
            Der Reaktor wurde auf 200&nbsp;MW thermisch heruntergefahren.
            Durch das Absenken der Leistung hat sich Xenon-135 im Kern akkumuliert
            und bremst die Kettenreaktion. OZR (Operativer Reaktivitätsvorrat)
            liegt nahe der Mindestgrenze.
          </p>

          <p style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--amber)' }}>ZIEL:</span>{' '}
            Stabilisiere die Leistung im Bereich <strong style={{ color: '#fff' }}>150–250&nbsp;MW</strong> und
            halte sie dort, während der Turbinen-Auslauftest durchgeführt wird.
          </p>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--amber)' }}>ERSTE MASSNAHMEN:</span>
            <ol style={{ paddingLeft: '18px', marginTop: '4px' }}>
              <li>MR-Stäbe (Handregler) vorsichtig ausfahren, um Xenon-Vergiftung auszugleichen.</li>
              <li>USP-Kurzabsorber bei Bedarf nachjustieren.</li>
              <li>OZR-Anzeige beobachten — <span style={{ color: 'var(--alarm-red)' }}>unter 15 Stäben OZR: kritische Grenze!</span></li>
              <li>Leistung langsam stabilisieren, nicht sprunghaft anpassen.</li>
            </ol>
          </div>

          <p style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--alarm-red)' }}>WARNUNG (OZR):</span>{' '}
            Sinkt der OZR unter 15&nbsp;Stäbe, ist die Kontrolle über die Kettenreaktion
            nicht mehr gewährleistet. Die Vorschrift verlangt die sofortige Abschaltung.
          </p>

          <p>
            <span style={{ color: 'var(--safe-green)' }}>ERFOLG:</span>{' '}
            Stabile Leistung bei 150–250&nbsp;MW über die gesamte Testdauer.
            Xenon-Vergiftung unter Kontrolle. Kein Auslösen der Notabschaltung (AZ-5) nötig.
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

