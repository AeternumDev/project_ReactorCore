'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import InfoTooltip from './InfoTooltip';

interface AZ5ButtonProps {
  az5Active: boolean;
  dispatch: React.Dispatch<{ type: 'TRIGGER_AZ5' }>;
}

export default function AZ5Button({ az5Active, dispatch }: AZ5ButtonProps) {
  const [capOpen, setCapOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldDispatchRef = useRef(false);

  // Dispatch AZ5 outside of setState updater to avoid "setState during render"
  useEffect(() => {
    if (shouldDispatchRef.current) {
      shouldDispatchRef.current = false;
      dispatch({ type: 'TRIGGER_AZ5' });
    }
  }, [holdProgress, dispatch]);

  const startHold = useCallback(() => {
    if (az5Active) return;
    if (!capOpen) {
      setCapOpen(true);
      return;
    }
    holdTimer.current = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + 10;
        if (next >= 100) {
          if (holdTimer.current) clearInterval(holdTimer.current);
          shouldDispatchRef.current = true;
          return 100;
        }
        return next;
      });
    }, 100);
  }, [az5Active, capOpen]);

  const endHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    if (holdProgress < 100) {
      setHoldProgress(0);
    }
  }, [holdProgress]);

  return (
    <div
      style={{
        border: '1px solid var(--alarm-red)',
        padding: '12px',
        background: 'var(--surface)',
        boxShadow: az5Active ? '0 0 15px var(--alarm-red)' : 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--alarm-red)',
          fontSize: '0.9rem',
          marginBottom: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '6px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>AZ-5 NOTABSCHALTER
          <InfoTooltip text={`AZ-5 — Letzter Notfallschalter. Fährt ALLE Steuerstäbe vollständig ein.

Schritt 1: Schutzkappe öffnen (klicken).
Schritt 2: Knopf gedrückt halten bis Fortschrittsbalken voll.

ACHTUNG: Beim RBMK-1000 haben die Stäbe Graphitspitzen!
Bei niedrigem OZR kann AZ-5 einen kurzen Leistungsanstieg verursachen,
bevor die Absorption greift — der sogenannte "Tip-Effekt".

Nur im absoluten Notfall verwenden!`} />
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Safety cap */}
        {!capOpen && !az5Active && (
          <div
            onClick={() => setCapOpen(true)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(45deg, #333 0px, #333 10px, #222 10px, #222 20px)',
              border: '2px solid var(--alarm-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-share-tech-mono), monospace',
                color: 'var(--alarm-red)',
                fontSize: '0.85rem',
              }}
            >
              ▲ SCHUTZKAPPE ÖFFNEN ▲
            </span>
          </div>
        )}

        <button
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          disabled={az5Active}
          style={{
            width: '100%',
            padding: '20px',
            background: az5Active ? '#400' : 'var(--bg)',
            border: `2px solid var(--alarm-red)`,
            cursor: az5Active ? 'not-allowed' : 'pointer',
            color: 'var(--alarm-red)',
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '1.1rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Hold progress bar */}
          {holdProgress > 0 && holdProgress < 100 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                height: '4px',
                width: `${holdProgress}%`,
                background: 'var(--alarm-red)',
              }}
            />
          )}
          {az5Active ? '☢ AZ-5 AKTIVIERT' : '☢ AZ-5 NOTABSCHALTER'}
          {!az5Active && capOpen && (
            <div style={{ fontSize: '0.7rem', marginTop: '4px', color: '#888' }}>
              3 SEKUNDEN HALTEN ZUM AKTIVIEREN
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
