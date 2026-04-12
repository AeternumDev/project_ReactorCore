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
        padding: '12px',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.9rem',
          marginBottom: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '6px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>NOTKÜHLSYSTEM (ECCS)
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
          padding: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: `0 0 8px ${eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
        }}
      >
        {/* Toggle switch */}
        <div
          style={{
            width: '48px',
            height: '24px',
            border: `1px solid ${eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
            position: 'relative',
            background: 'var(--bg)',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              background: eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)',
              position: 'absolute',
              top: '1px',
              left: eccsEnabled ? '25px' : '1px',
              transition: 'left 0.15s',
            }}
          />
        </div>

        <div style={{ textAlign: 'left' }}>
          <div
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.9rem',
              color: eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)',
            }}
            className={!eccsEnabled ? 'animate-pulse-alarm' : ''}
          >
            {eccsEnabled ? 'AKTIV — HISTORISCH INKORREKT' : 'DEAKTIVIERT — HISTORISCH KORREKT'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.7rem',
              color: '#666',
              marginTop: '4px',
            }}
          >
            Test-Protokoll: ECCS vor Testbeginn abschalten
          </div>
        </div>
      </button>
    </div>
  );
}
