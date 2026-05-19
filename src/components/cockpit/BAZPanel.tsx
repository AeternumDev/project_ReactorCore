'use client';

import { useState, useCallback, useRef } from 'react';
import InfoTooltip from './InfoTooltip';

interface BAZPanelProps {
  bazArmed: boolean;
  bazTriggered: boolean;
  dispatch: React.Dispatch<{ type: 'TOGGLE_BAZ' } | { type: 'TRIGGER_BAZ' }>;
}

export default function BAZPanel({ bazArmed, bazTriggered, dispatch }: BAZPanelProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = useCallback(() => {
    if (bazTriggered) return;
    holdTimer.current = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + 15;
        if (next >= 100) {
          if (holdTimer.current) clearInterval(holdTimer.current);
          dispatch({ type: 'TRIGGER_BAZ' });
          return 100;
        }
        return next;
      });
    }, 100);
  }, [bazTriggered, dispatch]);

  const endHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    if (holdProgress < 100) {
      setHoldProgress(0);
    }
  }, [holdProgress]);

  const bazColor = bazTriggered ? 'var(--alarm-red)' :
    bazArmed ? 'var(--safe-green)' : 'var(--warning-yellow)';

  return (
    <div
      style={{
        border: `1px solid ${bazColor}`,
        padding: '6px',
        background: 'var(--surface)',
        boxShadow: bazTriggered ? '0 0 10px var(--alarm-red)' : 'none',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: bazColor,
          fontSize: '0.68rem',
          marginBottom: '5px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>BAZ-SCHUTZ
          <InfoTooltip text={`BAZ — Schnelles Notabschaltsystem. Fährt alle Stäbe beschleunigt ein.

Schritt 1: SCHARFSCHALTEN — System bereit machen.
Schritt 2: AUSLÖSEN — Knopf gedrückt halten bis Fortschrittsbalken voll.

Im historischen Szenario war BAZ zunächst blockiert.

Bei Auslösung werden alle Steuerstäbe schnell eingefahren, um die Reaktion zu stoppen.
Langsamer als AZ-5, aber schneller als manuelles Einfahren.`} />
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {/* Arm/Disarm Toggle */}
        <button
          onClick={() => !bazTriggered && dispatch({ type: 'TOGGLE_BAZ' })}
          disabled={bazTriggered}
          style={{
            background: 'transparent',
            border: `1px solid ${bazColor}`,
            padding: '5px 6px',
            cursor: bazTriggered ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '30px',
          }}
        >
          {/* LED */}
          <div
            style={{
              width: '8px',
              height: '8px',
              background: bazColor,
              boxShadow: `0 0 4px ${bazColor}`,
            }}
            className={!bazArmed && !bazTriggered ? 'animate-pulse-alarm' : ''}
          />
          <div
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.62rem',
              color: bazColor,
              textAlign: 'left',
              lineHeight: 1.1,
              minWidth: 0,
            }}
          >
            {bazTriggered ? 'AUSGELÖST' : bazArmed ? 'SCHARF' : 'BLOCKIERT'}
          </div>
        </button>

        {/* Manual trigger button */}
        <button
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          disabled={bazTriggered}
          style={{
            background: bazTriggered ? '#400' : 'var(--bg)',
            border: `1px solid var(--warning-yellow)`,
            padding: '6px',
            cursor: bazTriggered ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.62rem',
            color: 'var(--warning-yellow)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '30px',
          }}
        >
          {holdProgress > 0 && holdProgress < 100 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                height: '3px',
                width: `${holdProgress}%`,
                background: 'var(--warning-yellow)',
              }}
            />
          )}
          {bazTriggered ? 'BAZ AKTIV' : 'HALTEN: AUSLÖSEN'}
        </button>

        {/* Auto-trigger conditions */}
        <div
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.5rem',
            color: '#555',
            lineHeight: '1.25',
          }}
        >
          AUTO: P&gt;110% | DR&gt;88 BAR
          <br />KÜHLFLUSS &lt;2000 L/s
        </div>
      </div>
    </div>
  );
}
