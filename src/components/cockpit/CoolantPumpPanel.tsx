'use client';

interface CoolantPumpPanelProps {
  pumpStates: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  dispatch: React.Dispatch<{ type: 'TOGGLE_PUMP'; payload: number }>;
}

export default function CoolantPumpPanel({ pumpStates, dispatch }: CoolantPumpPanelProps) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '12px',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.85rem',
          marginBottom: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '6px',
        }}
      >
        KÜHLMITTELPUMPEN — {pumpStates.filter(Boolean).length}/8 AKTIV
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
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
                fontSize: '0.7rem',
                color: 'var(--amber)',
              }}
            >
              MCP-{i + 1}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-share-tech-mono), monospace',
                fontSize: '0.6rem',
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
