'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  outcome: string;
  time: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const score = Number(searchParams.get('score') || '0');
  const elapsed = Number(searchParams.get('elapsed') || '0');
  const power = searchParams.get('power') || '0';
  const rods = searchParams.get('rods') || '0';
  const isExploded = searchParams.get('exploded') === 'true';
  const testCompleted = searchParams.get('completed') === 'true';

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => setLeaderboard(data.leaderboard || []))
      .catch(() => {});
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--amber)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        fontFamily: 'var(--font-rajdhani), sans-serif',
      }}
    >
      {/* Explosion flash */}
      {isExploded && (
        <div
          className="animate-pulse-alarm"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255, 32, 32, 0.06)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '800px' }}>
        {/* Outcome header */}
        {testCompleted && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-share-tech-mono), monospace',
                fontSize: '2.5rem',
                color: 'var(--safe-green)',
                textShadow: '0 0 20px var(--safe-green)',
                marginBottom: '12px',
              }}
            >
              ✓ TESTDURCHFÜHRUNG ERFOLGREICH
            </div>
            <p style={{ color: '#888', fontSize: '1rem' }}>
              Sie haben den Sicherheitstest ohne Kernschmelze abgeschlossen. Die Geschichte hätte anders verlaufen können.
            </p>
          </div>
        )}

        {isExploded && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-share-tech-mono), monospace',
                fontSize: '2.5rem',
                color: 'var(--alarm-red)',
                textShadow: '0 0 20px var(--alarm-red)',
                marginBottom: '12px',
              }}
            >
              ☢ KERNSCHMELZE — REAKTOR 4 ZERSTÖRT
            </div>
            <p style={{ color: '#888', fontSize: '1rem' }}>
              Wie am 26. April 1986 hat der Reaktor die kritische Grenze überschritten.
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          {[
            { label: 'SCORE', value: String(score), color: 'var(--amber)' },
            { label: 'ÜBERLEBENSZEIT', value: formatTime(elapsed), color: 'var(--safe-green)' },
            { label: 'MAX. LEISTUNG', value: `${power} MW`, color: 'var(--warning-yellow)' },
            { label: 'STÄBE BEI ENDE', value: rods, color: 'var(--amber)' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-share-tech-mono), monospace',
                  fontSize: '0.65rem',
                  color: '#666',
                  marginBottom: '8px',
                }}
              >
                {stat.label}
              </div>
              <div
                className="seven-segment"
                style={{
                  fontFamily: 'var(--font-share-tech-mono), monospace',
                  fontSize: '2rem',
                  color: stat.color,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              padding: '16px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-share-tech-mono), monospace',
                fontSize: '0.85rem',
                color: 'var(--amber)',
                marginBottom: '12px',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '8px',
              }}
            >
              RANGLISTE — TOP 10
            </div>
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
                  <th style={{ textAlign: 'left', padding: '6px', color: '#888' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '6px', color: '#888' }}>NAME</th>
                  <th style={{ textAlign: 'right', padding: '6px', color: '#888' }}>SCORE</th>
                  <th style={{ textAlign: 'center', padding: '6px', color: '#888' }}>ERGEBNIS</th>
                  <th style={{ textAlign: 'right', padding: '6px', color: '#888' }}>ZEIT</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.rank} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px', color: 'var(--amber)' }}>{entry.rank}</td>
                    <td style={{ padding: '6px', color: 'var(--amber)' }}>{entry.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: 'var(--safe-green)' }}>{entry.score}</td>
                    <td style={{ padding: '6px', textAlign: 'center', color: entry.outcome === 'ERFOLG' ? 'var(--safe-green)' : 'var(--alarm-red)' }}>{entry.outcome}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: '#888' }}>{entry.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            className="btn-industrial glow-amber"
            style={{ fontFamily: 'var(--font-share-tech-mono), monospace' }}
            onClick={() => router.push('/game')}
          >
            [ NOCHMAL SPIELEN ]
          </button>
          <button
            className="btn-industrial"
            style={{ fontFamily: 'var(--font-share-tech-mono), monospace' }}
            onClick={() => router.push('/')}
          >
            [ ZUR STARTSEITE ]
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            color: 'var(--amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-share-tech-mono), monospace',
          }}
        >
          ERGEBNISSE WERDEN GELADEN...
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
