'use client';

import { PHYSICS } from '@/lib/physics/constants';

interface ReactivityPanelProps {
  reactivityMargin: number;
  controlRods: number;
  powerMode: 'manual' | 'auto';
  powerSetpoint: number;
  thermalPower: number;
  manualRods: number;
  autoRods: number;
  shortenedRods: number;
  safetyRods: number;
  feedWaterFlow: number;
  drumSeparatorLevel: number;
  xenonConcentration: number;
  dispatch: React.Dispatch<
    | { type: 'SET_POWER_MODE'; payload: 'manual' | 'auto' }
    | { type: 'SET_POWER_SETPOINT'; payload: number }
    | { type: 'SET_FEED_WATER'; payload: number }
  >;
}

export default function ReactivityPanel({
  reactivityMargin,
  controlRods,
  powerMode,
  powerSetpoint,
  thermalPower,
  manualRods,
  autoRods,
  shortenedRods,
  safetyRods,
  feedWaterFlow,
  drumSeparatorLevel,
  xenonConcentration,
  dispatch,
}: ReactivityPanelProps) {
  const ozrColor = reactivityMargin < PHYSICS.OZR_MINIMUM_SAFE ? 'var(--alarm-red)' :
    reactivityMargin < PHYSICS.OZR_WARNING ? 'var(--warning-yellow)' : 'var(--safe-green)';

  const powerError = Math.abs(thermalPower - powerSetpoint);
  const powerColor = powerError < 50 ? 'var(--safe-green)' :
    powerError < 200 ? 'var(--warning-yellow)' : 'var(--alarm-red)';

  const drumColor = drumSeparatorLevel < PHYSICS.DRUM_LEVEL_LOW ? 'var(--alarm-red)' :
    drumSeparatorLevel > PHYSICS.DRUM_LEVEL_HIGH ? 'var(--warning-yellow)' : 'var(--safe-green)';

  // Rod guidance
  function getRodGuidance(): { text: string; color: string } {
    const mrFraction = manualRods / PHYSICS.MANUAL_RODS_MAX;
    if (thermalPower < PHYSICS.TEST_POWER_MIN && mrFraction > 0.3) {
      return { text: '→ MR AUSFAHREN — Leistung erhöhen', color: 'var(--warning-yellow)' };
    }
    if (thermalPower < PHYSICS.TEST_POWER_MIN && mrFraction <= 0.3 && shortenedRods > 10) {
      return { text: '→ USP AUSFAHREN — zusätzliche Reaktivität freigeben', color: 'var(--warning-yellow)' };
    }
    if (thermalPower > PHYSICS.TEST_POWER_MAX) {
      return { text: '→ MR EINFAHREN — Leistung begrenzen', color: 'var(--warning-yellow)' };
    }
    if (reactivityMargin < PHYSICS.OZR_MINIMUM_SAFE) {
      return { text: '⚠ OZR KRITISCH — Sofortmaßnahmen erforderlich', color: 'var(--alarm-red)' };
    }
    return { text: '● Stabposition angemessen', color: 'var(--safe-green)' };
  }
  const rodGuidance = getRodGuidance();

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '8px',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* OZR Anzeige */}
      <div style={{ border: '1px solid var(--border)', padding: '6px', background: 'var(--bg)' }}>
        <div
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            color: 'var(--amber)',
            fontSize: '0.75rem',
            marginBottom: '4px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '3px',
          }}
        >
          OZR — OPERATIVER REAKTIVITÄTSVORRAT
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className={`seven-segment ${reactivityMargin < PHYSICS.OZR_MINIMUM_SAFE ? 'animate-pulse-alarm' : ''}`}
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '1.6rem',
              color: ozrColor,
              lineHeight: 1,
            }}
          >
            {reactivityMargin}
          </div>
          <div style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.6rem',
            color: '#666',
          }}>
            STABÄQUIV.
            <br />MIN: {PHYSICS.OZR_MINIMUM_SAFE}
            <br />WARN: {PHYSICS.OZR_WARNING}
          </div>
        </div>

        {/* OZR Balkenanzeige */}
        <div style={{
          height: '6px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          marginTop: '4px',
          position: 'relative',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (reactivityMargin / PHYSICS.MAX_CONTROL_RODS) * 100)}%`,
            background: ozrColor,
            transition: 'width 0.3s',
          }} />
          {/* Warnmarke */}
          <div style={{
            position: 'absolute',
            left: `${(PHYSICS.OZR_WARNING / PHYSICS.MAX_CONTROL_RODS) * 100}%`,
            top: -2,
            bottom: -2,
            width: '1px',
            background: 'var(--warning-yellow)',
          }} />
          <div style={{
            position: 'absolute',
            left: `${(PHYSICS.OZR_MINIMUM_SAFE / PHYSICS.MAX_CONTROL_RODS) * 100}%`,
            top: -2,
            bottom: -2,
            width: '1px',
            background: 'var(--alarm-red)',
          }} />
        </div>

        {/* Stabführung */}
        <div style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.6rem',
          color: rodGuidance.color,
          marginTop: '4px',
          padding: '2px 4px',
          border: `1px solid ${rodGuidance.color}33`,
          background: `${rodGuidance.color}08`,
        }}>
          {rodGuidance.text}
        </div>
      </div>

      {/* Leistungsregelung */}
      <div style={{ border: '1px solid var(--border)', padding: '6px', background: 'var(--bg)' }}>
        <div
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            color: 'var(--amber)',
            fontSize: '0.75rem',
            marginBottom: '4px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '3px',
          }}
        >
          LEISTUNGSREGELUNG (LAR)
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          <button
            onClick={() => dispatch({ type: 'SET_POWER_MODE', payload: 'manual' })}
            style={{
              flex: 1,
              padding: '4px',
              background: powerMode === 'manual' ? 'rgba(255,140,0,0.15)' : 'transparent',
              border: `1px solid ${powerMode === 'manual' ? 'var(--amber)' : '#333'}`,
              color: powerMode === 'manual' ? 'var(--amber)' : '#555',
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.7rem',
              cursor: 'pointer',
            }}
          >
            MANUELL
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_POWER_MODE', payload: 'auto' })}
            style={{
              flex: 1,
              padding: '4px',
              background: powerMode === 'auto' ? 'rgba(0,255,65,0.15)' : 'transparent',
              border: `1px solid ${powerMode === 'auto' ? 'var(--safe-green)' : '#333'}`,
              color: powerMode === 'auto' ? 'var(--safe-green)' : '#555',
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.7rem',
              cursor: 'pointer',
            }}
          >
            AUTOMATIK
          </button>
        </div>

        {/* Setpoint (immer sichtbar, in AUTO aktiv) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.65rem',
            color: '#888',
            minWidth: '35px',
          }}>SOLL</span>
          <input
            type="range"
            min={200}
            max={1200}
            step={10}
            value={powerSetpoint}
            onChange={(e) => dispatch({ type: 'SET_POWER_SETPOINT', payload: Number(e.target.value) })}
            style={{
              flex: 1,
              height: '4px',
              appearance: 'none',
              background: `linear-gradient(to right, var(--amber) ${((powerSetpoint - 200) / 1000) * 100}%, #333 ${((powerSetpoint - 200) / 1000) * 100}%)`,
              cursor: 'pointer',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.75rem',
            color: 'var(--amber)',
            minWidth: '48px',
            textAlign: 'right',
          }}>{powerSetpoint} MW</span>
        </div>

        {/* IST vs SOLL */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.65rem',
        }}>
          <span style={{ color: '#666' }}>IST: {thermalPower.toFixed(0)} MW</span>
          <span style={{ color: powerColor }}>
            Δ {powerError.toFixed(0)} MW
          </span>
        </div>
      </div>

      {/* Stabübersicht */}
      <div style={{ border: '1px solid var(--border)', padding: '6px', background: 'var(--bg)' }}>
        <div
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            color: 'var(--amber)',
            fontSize: '0.75rem',
            marginBottom: '4px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '3px',
          }}
        >
          STABPOSITION — ÜBERSICHT
        </div>

        <div style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}>
          {[
            { label: 'MR  MANUELL', value: manualRods, max: PHYSICS.MANUAL_RODS_MAX, color: '#00aaff' },
            { label: 'AR  AUTO', value: autoRods, max: PHYSICS.AUTO_RODS_MAX, color: '#ffaa00' },
            { label: 'USP VERKÜRZT', value: shortenedRods, max: PHYSICS.SHORTENED_RODS_MAX, color: '#ff44ff' },
            { label: 'AZ  SICHERHEIT', value: safetyRods, max: PHYSICS.SAFETY_RODS_MAX, color: '#ff2222' },
          ].map((rod) => (
            <div key={rod.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: rod.color, minWidth: '80px' }}>{rod.label}</span>
              <div style={{
                flex: 1,
                height: '4px',
                background: '#222',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(rod.value / rod.max) * 100}%`,
                  background: rod.color,
                  transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ color: rod.color, minWidth: '38px', textAlign: 'right' }}>
                {typeof rod.value === 'number' ? rod.value.toFixed(0) : rod.value}/{rod.max}
              </span>
            </div>
          ))}
          <div style={{ color: '#666', textAlign: 'right', marginTop: '2px' }}>
            GESAMT: {controlRods}/{PHYSICS.MAX_CONTROL_RODS}
          </div>
        </div>
      </div>

      {/* Speisewasser & Trommelabscheider */}
      <div style={{ border: '1px solid var(--border)', padding: '6px', background: 'var(--bg)' }}>
        <div
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            color: 'var(--amber)',
            fontSize: '0.75rem',
            marginBottom: '4px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '3px',
          }}
        >
          SPEISEWASSER / TROMMELABSCHEIDER
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.65rem',
            color: '#888',
            minWidth: '55px',
          }}>SPEISEW.</span>
          <input
            type="range"
            min={0}
            max={1000}
            step={10}
            value={feedWaterFlow}
            onChange={(e) => dispatch({ type: 'SET_FEED_WATER', payload: Number(e.target.value) })}
            style={{
              flex: 1,
              height: '4px',
              appearance: 'none',
              background: `linear-gradient(to right, #2288cc ${(feedWaterFlow / 1000) * 100}%, #333 ${(feedWaterFlow / 1000) * 100}%)`,
              cursor: 'pointer',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.7rem',
            color: '#2288cc',
            minWidth: '48px',
            textAlign: 'right',
          }}>{feedWaterFlow} L/s</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.65rem',
        }}>
          <span style={{ color: '#888', minWidth: '55px' }}>TROMMEL</span>
          <div style={{
            flex: 1,
            height: '12px',
            background: '#111',
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${drumSeparatorLevel}%`,
              background: `rgba(34,136,204,0.3)`,
              borderTop: `1px solid ${drumColor}`,
              transition: 'height 0.3s',
            }} />
            {/* Low/High marks */}
            <div style={{
              position: 'absolute',
              bottom: `${PHYSICS.DRUM_LEVEL_LOW}%`,
              left: 0,
              right: 0,
              height: '1px',
              background: 'var(--alarm-red)',
              opacity: 0.5,
            }} />
            <div style={{
              position: 'absolute',
              bottom: `${PHYSICS.DRUM_LEVEL_HIGH}%`,
              left: 0,
              right: 0,
              height: '1px',
              background: 'var(--warning-yellow)',
              opacity: 0.5,
            }} />
          </div>
          <span style={{ color: drumColor, minWidth: '30px', textAlign: 'right' }}>
            {drumSeparatorLevel.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
