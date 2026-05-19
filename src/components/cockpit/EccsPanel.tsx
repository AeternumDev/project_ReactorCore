'use client';

import InfoTooltip from './InfoTooltip';

interface EccsPanelProps {
  eccsEnabled: boolean;
  dispatch: React.Dispatch<{ type: 'TOGGLE_ECCS' }>;
}

export default function EccsPanel({ eccsEnabled, dispatch }: EccsPanelProps) {
  return (
    <div
      style={{
        border: `1px solid ${eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
        padding: '6px',
        background: 'var(--surface)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.68rem',
          marginBottom: '5px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>ECCS / SAOR
          <InfoTooltip text={`Notkernkühlsystem (ECCS) — pumpt bei Kühlmittelverlust kaltes Wasser in den Kern.

Im historischen Test wurde ECCS abgeschaltet, um eine Fehlauslösung zu verhindern.
Abschalten ist historisch korrekt, aber entfernt eine wichtige Sicherheitsebene.

Bei aktivem ECCS: Automatische Noteinspeisung bei Kühlmittelverlust.
Bei deaktiviertem ECCS: Kein automatischer Schutz — manuelle Kontrolle erforderlich.

Klicken zum Ein-/Ausschalten.`} />
        </span>
      </div>

      <button
        onClick={() => dispatch({ type: 'TOGGLE_ECCS' })}
        style={{
          width: '100%',
          background: 'transparent',
          border: `2px solid ${eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
          padding: '6px',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '34px minmax(0, 1fr)',
          alignItems: 'center',
          gap: '6px',
          boxShadow: `0 0 5px ${eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
          minHeight: '48px',
        }}
      >
        {/* Toggle switch */}
        <div
          style={{
            width: '32px',
            height: '16px',
            border: `1px solid ${eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
            position: 'relative',
            background: 'var(--bg)',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              background: eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)',
              position: 'absolute',
              top: '1px',
              left: eccsEnabled ? '17px' : '1px',
              transition: 'left 0.15s',
            }}
          />
        </div>

        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.64rem',
              color: eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)',
              lineHeight: 1.1,
            }}
            className={!eccsEnabled ? 'animate-pulse-alarm' : ''}
          >
            {eccsEnabled ? 'AKTIV' : 'DEAKTIVIERT'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.52rem',
              color: '#666',
              marginTop: '3px',
              lineHeight: 1.2,
            }}
          >
            {eccsEnabled ? 'Schutz bereit' : 'Historischer Testzustand'}
          </div>
        </div>
      </button>
    </div>
  );
}
