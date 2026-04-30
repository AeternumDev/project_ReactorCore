'use client';

import InfoTooltip from './InfoTooltip';
import { PHYSICS } from '@/lib/physics/constants';

interface CoolantPumpPanelProps {
  pumpStates: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  pumpSpeeds: [number, number, number, number, number, number, number, number];
  rundownBusActive: boolean;
  dispatch: React.Dispatch<
    | { type: 'TOGGLE_PUMP'; payload: number }
    | { type: 'TOGGLE_RUNDOWN_BUS' }
  >;
}

const RUNDOWN_INDICES = new Set<number>(PHYSICS.PUMP_RUNDOWN_BUS_INDICES);

export default function CoolantPumpPanel({
  pumpStates,
  pumpSpeeds,
  rundownBusActive,
  dispatch,
}: CoolantPumpPanelProps) {
  const activeCount = pumpSpeeds.filter((s) => s >= PHYSICS.PUMP_ACTIVE_THRESHOLD).length;

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '8px',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.85rem',
          marginBottom: '6px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '4px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>HAUPTKREISPUMPEN — {activeCount}/8 AKTIV
          <InfoTooltip text={`Hauptkreispumpen (ГЦН-317) treiben das Kühlmittel durch den Reaktorkern.

8 Pumpen, aufgeteilt in zwei Loops (links 1–4, rechts 5–8).
Pumpen 3, 4, 7, 8 hängen am Reservebus, der vom auslaufenden TG-8 versorgt wird,
sobald der RUNDOWN-BUS abgeschaltet ist (Auslauftest am 26.04.1986).

Schwungrad-Trägheit: Nach Abschalten läuft jede Pumpe ~45 s aus,
nach Einschalten dauert der Hochlauf einige Sekunden — die Drehzahlanzeige zeigt
die tatsächliche %‑Drehzahl.

≥ 6 Pumpen sind Vorschrift. Zu wenig Kühlung bei hoher Leistung →
Kanal-Sieden → positive Dampfblasenrückkopplung → Leistungsexkursion.`} />
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
        }}
      >
        {pumpStates.map((isCommanded, i) => {
          const speed = pumpSpeeds[i];
          const isSpinning = speed >= PHYSICS.PUMP_ACTIVE_THRESHOLD;
          const onRundown = RUNDOWN_INDICES.has(i);
          const ledColor = isSpinning ? 'var(--safe-green)' : 'var(--alarm-red)';
          // Während des Auslaufs: Pumpe ist commanded ON, dreht aber unter Soll → amber.
          const isCoasting = isCommanded && !isSpinning && speed > 0.02;
          const borderColor = isCoasting
            ? 'var(--amber)'
            : isCommanded
              ? 'var(--safe-green)'
              : 'var(--alarm-red)';
          return (
            <button
              key={i}
              onClick={() => dispatch({ type: 'TOGGLE_PUMP', payload: i })}
              style={{
                background: 'transparent',
                border: `1px solid ${borderColor}`,
                padding: '8px 4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                position: 'relative',
              }}
            >
              {onRundown && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 3,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                    fontSize: '0.55rem',
                    color: 'var(--amber)',
                    opacity: 0.85,
                  }}
                  title="Pumpe am Reservebus (TG-8 Rundown)"
                >
                  RB
                </span>
              )}
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  background: ledColor,
                  boxShadow: `0 0 6px ${ledColor}`,
                }}
                className={!isSpinning ? 'animate-pulse-alarm' : ''}
              />
              <span
                style={{
                  fontFamily: 'var(--font-share-tech-mono), monospace',
                  fontSize: '0.8rem',
                  color: 'var(--amber)',
                }}
              >
                HKP-{i + 1}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-share-tech-mono), monospace',
                  fontSize: '0.7rem',
                  color: borderColor,
                }}
              >
                {Math.round(speed * 100)}%
              </span>
              {/* Drehzahlbalken */}
              <div
                style={{
                  width: '100%',
                  height: '3px',
                  background: '#1a1a1a',
                  marginTop: '2px',
                }}
              >
                <div
                  style={{
                    width: `${Math.round(speed * 100)}%`,
                    height: '100%',
                    background: borderColor,
                    transition: 'width 0.3s linear',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Reservebus-Schalter */}
      <div
        style={{
          marginTop: '8px',
          paddingTop: '6px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <button
          onClick={() => dispatch({ type: 'TOGGLE_RUNDOWN_BUS' })}
          style={{
            flex: 1,
            background: 'transparent',
            border: `1px solid ${rundownBusActive ? 'var(--safe-green)' : 'var(--amber)'}`,
            color: rundownBusActive ? 'var(--safe-green)' : 'var(--amber)',
            padding: '6px',
            cursor: 'pointer',
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
          }}
          title="HKP 3, 4, 7, 8 vom Netz trennen — sie laufen dann mit dem auslaufenden TG-8 mit (Auslauftest 26.04.1986)."
        >
          RUNDOWN-BUS: {rundownBusActive ? 'NETZ' : 'TG-8 AUSLAUF'}
        </button>
      </div>
    </div>
  );
}
