'use client';

import { PHYSICS } from '@/lib/physics/constants';
import InfoTooltip from './InfoTooltip';

interface TurbinePanelProps {
  turbineConnected: boolean;
  turbineValveOpen: number;
  turbineSpeed: number;
  generatorOutput: number;
  steamPressure: number;
  feedWaterFlow: number;
  drumSeparatorLevel: number;
  dispatch: React.Dispatch<
    | { type: 'TOGGLE_TURBINE' }
    | { type: 'SET_TURBINE_VALVE'; payload: number }
    | { type: 'SET_FEED_WATER'; payload: number }
  >;
}

export default function TurbinePanel({
  turbineConnected,
  turbineValveOpen,
  turbineSpeed,
  generatorOutput,
  steamPressure,
  feedWaterFlow,
  drumSeparatorLevel,
  dispatch,
}: TurbinePanelProps) {
  const drumColor = drumSeparatorLevel < PHYSICS.DRUM_LEVEL_LOW ? 'var(--alarm-red)' :
    drumSeparatorLevel > PHYSICS.DRUM_LEVEL_HIGH ? 'var(--warning-yellow)' : 'var(--safe-green)';
  const speedPercent = (turbineSpeed / PHYSICS.TURBINE_NOMINAL_SPEED) * 100;
  const isOverspeed = turbineSpeed > PHYSICS.TURBINE_MAX_SPEED * 0.9;

  const speedColor = isOverspeed ? 'var(--alarm-red)' :
    speedPercent > 95 ? 'var(--safe-green)' :
    speedPercent > 50 ? 'var(--amber)' : '#666';

  return (
    <div
      style={{
        border: `1px solid ${isOverspeed ? 'var(--alarm-red)' : 'var(--border)'}`,
        padding: '8px',
        background: 'var(--surface)',
      }}
      className={isOverspeed ? 'animate-border-flash' : ''}
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
        <span style={{ display: 'flex', alignItems: 'center' }}>TURBOGENERATOR 8
          <InfoTooltip text={`Turbogenerator Nr. 8 wandelt Dampfenergie in Strom um.

VERBINDEN/TRENNEN: Koppelt die Turbine ans Dampfnetz.
VENTIL: Steuert den Dampfzufluss (0-100%).

Beim Auslauftest wird die Turbine getrennt und läuft aus eigener Trägheit weiter.
Die Generatorleistung muss die Kühlmittelpumpen während des Auslaufs versorgen.

Überdrehzahl über ${PHYSICS.TURBINE_MAX_SPEED} RPM kann die Turbine beschädigen.`} />
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Turbine connect/disconnect */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_TURBINE' })}
          style={{
            background: 'transparent',
            border: `1px solid ${turbineConnected ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
            padding: '6px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              background: turbineConnected ? 'var(--safe-green)' : 'var(--alarm-red)',
              boxShadow: `0 0 4px ${turbineConnected ? 'var(--safe-green)' : 'var(--alarm-red)'}`,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.75rem',
              color: turbineConnected ? 'var(--safe-green)' : 'var(--alarm-red)',
            }}
          >
            {turbineConnected ? 'VERBUNDEN' : 'GETRENNT'}
          </span>
        </button>

        {/* Valve control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.7rem',
              color: '#888',
              minWidth: '44px',
            }}
          >
            VENTIL
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={turbineValveOpen}
            onChange={(e) => dispatch({ type: 'SET_TURBINE_VALVE', payload: Number(e.target.value) })}
            style={{
              flex: 1,
              height: '4px',
              appearance: 'none',
              background: `linear-gradient(to right, var(--amber) ${turbineValveOpen}%, #333 ${turbineValveOpen}%)`,
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.8rem',
              color: 'var(--amber)',
              minWidth: '32px',
              textAlign: 'right',
            }}
          >
            {turbineValveOpen}%
          </span>
        </div>

        {/* Readouts */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.7rem',
          }}
        >
          <div style={{
            border: '1px solid var(--border)',
            padding: '4px 6px',
            background: 'var(--bg)',
          }}>
            <div style={{ color: '#555', fontSize: '0.6rem' }}>DREHZAHL</div>
            <div style={{ color: speedColor, fontSize: '0.9rem' }} className="seven-segment">
              {turbineSpeed.toFixed(0)}
            </div>
            <div style={{ color: '#555', fontSize: '0.55rem' }}>RPM</div>
          </div>
          <div style={{
            border: '1px solid var(--border)',
            padding: '4px 6px',
            background: 'var(--bg)',
          }}>
            <div style={{ color: '#555', fontSize: '0.6rem' }}>GENERATOR</div>
            <div style={{ color: 'var(--amber)', fontSize: '0.9rem' }} className="seven-segment">
              {generatorOutput.toFixed(0)}
            </div>
            <div style={{ color: '#555', fontSize: '0.55rem' }}>MW(e)</div>
          </div>
        </div>

        {/* SPEISEWASSER / TROMMELABSCHEIDER */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '6px',
          marginTop: '4px',
        }}>
          <div style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            color: 'var(--amber)',
            fontSize: '0.75rem',
            marginBottom: '4px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '3px',
          }}>
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
                background: 'rgba(34,136,204,0.3)',
                borderTop: `1px solid ${drumColor}`,
                transition: 'height 0.3s',
              }} />
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
    </div>
  );
}
