'use client';

import { useState, useCallback } from 'react';
import InfoTooltip from './InfoTooltip';
import { PHYSICS } from '@/lib/physics/constants';

interface AZ5ButtonProps {
  az5Triggered: boolean;
  thermalPower: number;
  reactivityMargin: number;
  dispatch: React.Dispatch<{ type: 'TRIGGER_AZ5' }>;
}

export default function AZ5Button({ az5Triggered, thermalPower, reactivityMargin, dispatch }: AZ5ButtonProps) {
  const [capOpen, setCapOpen] = useState(false);

  const reactorStalled = thermalPower <= PHYSICS.XENON_STALL_POWER && !az5Triggered;
  const capClosed = !capOpen && !az5Triggered;

  const triggerButton = useCallback(() => {
    if (az5Triggered) return;
    if (!capOpen) {
      setCapOpen(true);
      return;
    }
    dispatch({ type: 'TRIGGER_AZ5' });
  }, [az5Triggered, capOpen, dispatch]);

  return (
    <div
      style={{
        border: '1px solid var(--alarm-red)',
        padding: '12px',
        background: 'var(--surface)',
        boxShadow: az5Triggered ? '0 0 15px var(--alarm-red)' : 'none',
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
Schritt 2: Freigelegten Knopf drücken.

ACHTUNG: Beim RBMK-1000 haben die Stäbe Graphitspitzen!
Bei niedrigem OZR kann AZ-5 einen kurzen Leistungsanstieg verursachen,
bevor die Absorption greift — der sogenannte "Tip-Effekt".

Nur im absoluten Notfall verwenden!`} />
        </span>
      </div>

      {reactorStalled && (
        <div
          className="animate-blink"
          style={{
            border: '1px solid var(--warning-yellow)',
            background: 'rgba(255, 215, 0, 0.08)',
            color: 'var(--warning-yellow)',
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.72rem',
            lineHeight: 1.35,
            padding: '6px 8px',
            marginBottom: '8px',
          }}
        >
          REAKTOR GESTALLT ({Math.round(thermalPower)} MW) — VORSCHRIFT: AZ-5 AUSLÖSEN
          <br />OZR: {reactivityMargin} STABÄQUIV.
        </div>
      )}

      <div>
        <button
          onClick={triggerButton}
          disabled={az5Triggered}
          style={{
            width: '100%',
            padding: '20px',
            background: capClosed
              ? 'repeating-linear-gradient(45deg, #333 0px, #333 10px, #222 10px, #222 20px)'
              : az5Triggered
                ? '#400'
                : 'var(--bg)',
            border: `2px solid var(--alarm-red)`,
            cursor: az5Triggered ? 'not-allowed' : 'pointer',
            color: 'var(--alarm-red)',
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '1.1rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {capClosed ? 'SCHUTZKAPPE ÖFFNEN' : az5Triggered ? '☢ AZ-5 AUSGELÖST' : '☢ AZ-5 NOTABSCHALTER'}
          {!az5Triggered && capOpen && (
            <div style={{ fontSize: '0.7rem', marginTop: '4px', color: '#888' }}>
              DRÜCKEN ZUM AKTIVIEREN
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
