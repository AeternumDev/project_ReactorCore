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
            return (
              <circle
                key={i}
                cx={300 + Math.cos(angle) * 175}
                cy={300 + Math.sin(angle) * 175}
                r="4"
                fill="var(--amber)"
              />
            );
          })}
          {/* Control rod channels */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = ((i * 45 + 22.5) * Math.PI) / 180;
            return (
              <rect
                key={`rod-${i}`}
                x={300 + Math.cos(angle) * 130 - 3}
                y={300 + Math.sin(angle) * 130 - 10}
                width="6"
                height="20"
                fill="var(--amber)"
                transform={`rotate(${i * 45 + 22.5}, ${300 + Math.cos(angle) * 130}, ${300 + Math.sin(angle) * 130})`}
              />
            );
          })}
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        <h1
          className="text-6xl tracking-wider mb-4"
          style={{ fontFamily: 'var(--font-share-tech-mono), monospace', color: 'var(--amber)' }}
        >
          ☢ REAKTORCORE
        </h1>
        <p
          className="text-sm tracking-widest mb-8 opacity-70"
          style={{ fontFamily: 'var(--font-share-tech-mono), monospace', color: 'var(--amber)' }}
        >
          TSCHERNOBYL-SIMULATION | 26. APRIL 1986 | 01:23 UHR
        </p>
        <div className="mb-2 text-sm" style={{ color: '#666' }}>
          REAKTORTYP: RBMK-1000 | LEISTUNG: 3200 MW
        </div>
        <div className="mb-12 text-sm" style={{ color: '#666' }}>
          STATUS: SICHERHEITSTEST AUSSTEHEND
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

