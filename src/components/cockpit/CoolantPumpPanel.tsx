'use client';

import InfoTooltip from './InfoTooltip';

interface CoolantPumpPanelProps {
  pumpStates: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  dispatch: React.Dispatch<{ type: 'TOGGLE_PUMP'; payload: number }>;
}

export default function CoolantPumpPanel({ pumpStates, dispatch }: CoolantPumpPanelProps) {
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
        <span style={{ display: 'flex', alignItems: 'center' }}>KÜHLMITTELPUMPEN — {pumpStates.filter(Boolean).length}/8 AKTIV
          <InfoTooltip text={`Hauptumwälzpumpen (MCP) treiben das Kühlmittel durch den Reaktorkern.

8 Pumpen verfügbar — je mehr aktiv, desto höher der Kühlmittelfluss.
Höherer Fluss = bessere Kühlung, aber auch weniger Dampfblasen.

Für den Turbinen-Auslauftest müssen Pumpen strategisch abgeschaltet werden.
Achtung: Zu wenig Kühlung bei hoher Leistung führt zu Überhitzung!

Klicken Sie auf eine Pumpe, um sie ein-/auszuschalten.`} />
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
        }}
      >
        {pumpStates.map((isActive, i) => (
          <button
            key={i}
            onClick={() => dispatch({ type: 'TOGGLE_PUMP', payload: i })}
            style={{
              background: 'transparent',
              border: `1px solid ${isActive ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
              padding: '8px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {/* LED indicator */}
            <div
              style={{
                width: '10px',
                height: '10px',
                background: isActive ? 'var(--safe-green)' : 'var(--alarm-red)',
                boxShadow: `0 0 6px ${isActive ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
              }}
              className={!isActive ? 'animate-pulse-alarm' : ''}
            />
            <span
              style={{
                fontFamily: 'var(--font-share-tech-mono), monospace',
                fontSize: '0.8rem',
                color: 'var(--amber)',
              }}
            >
              MCP-{i + 1}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-share-tech-mono), monospace',
                fontSize: '0.7rem',
                color: isActive ? 'var(--safe-green)' : 'var(--alarm-red)',
              }}
            >
              {isActive ? 'AKTIV' : 'AUS'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
