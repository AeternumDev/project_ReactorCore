'use client';

import { useState, useCallback } from 'react';
import { PHYSICS } from '@/lib/physics/constants';
import { GameAction } from '@/lib/physics/types';
import InfoTooltip from './InfoTooltip';

interface ControlRodPanelProps {
  controlRods: number;
  manualRods: number;
  autoRods: number;
  shortenedRods: number;
  safetyRods: number;
  powerMode: 'manual' | 'auto';
  thermalPower: number;
  xenonConcentration: number;
  reactivityMargin: number;
  elapsedSeconds: number;
  dispatch: React.Dispatch<GameAction>;
}

/* ─── Phase guidance ─── */
type Phase = 'startup' | 'stabilize' | 'xenon_recovery' | 'power_descent' | 'steady' | 'critical';

function getPhase(thermalPower: number, xenon: number, ozr: number, elapsed: number): Phase {
  if (ozr < PHYSICS.OZR_MINIMUM_SAFE) return 'critical';
  if (xenon > 0.55 && thermalPower < PHYSICS.TEST_POWER_MIN) return 'xenon_recovery';
  if (thermalPower < PHYSICS.TEST_POWER_MIN && elapsed < 60) return 'startup';
  if (thermalPower < PHYSICS.TEST_POWER_MIN) return 'power_descent';
  if (thermalPower > PHYSICS.TEST_POWER_MAX) return 'power_descent';
  if (Math.abs(thermalPower - PHYSICS.TEST_POWER_TARGET) < 30) return 'steady';
  return 'stabilize';
}

function getPhaseInfo(phase: Phase) {
  switch (phase) {
    case 'startup':
      return { label: 'ANFAHRPHASE', goal: `Leistung auf ${PHYSICS.TEST_POWER_TARGET} MW bringen`, instruction: 'MR-Stäbe AUSFAHREN. AR auf AUTOMATIK.', color: '#00aaff' };
    case 'stabilize':
      return { label: 'STABILISIERUNG', goal: `${PHYSICS.TEST_POWER_MIN}–${PHYSICS.TEST_POWER_MAX} MW halten`, instruction: 'Kleine MR-Korrekturen. AR gleicht aus.', color: 'var(--warning-yellow)' };
    case 'xenon_recovery':
      return { label: 'XENON-VERGIFTUNG', goal: 'Xenon kompensieren', instruction: 'MR+USP AUSFAHREN. OZR beachten!', color: '#ff44ff' };
    case 'power_descent':
      return { label: 'LEISTUNGSKORREKTUR', goal: `Zurück auf ${PHYSICS.TEST_POWER_TARGET} MW`, instruction: 'MR anpassen: zu hoch → EINFAHREN, zu niedrig → AUSFAHREN.', color: 'var(--warning-yellow)' };
    case 'steady':
      return { label: 'STABIL', goal: `Zielband ${PHYSICS.TEST_POWER_MIN}–${PHYSICS.TEST_POWER_MAX} MW`, instruction: 'Minimale Korrekturen. Xenon+OZR beobachten.', color: 'var(--safe-green)' };
    case 'critical':
      return { label: '⚠ KRITISCH', goal: 'OZR unter Minimum!', instruction: 'Stäbe EINFAHREN oder AZ-5!', color: 'var(--alarm-red)' };
  }
}

/* ─── Circular gauge (SVG) — selsyn-style ─── */
function AnalogGauge({ value, max, label, color, size = 96 }: {
  value: number; max: number; label: string; color: string; size?: number;
}) {
  const fraction = value / max;
  const angleRange = 240; // degrees of arc
  const startAngle = -210; // start from bottom-left
  const angle = startAngle + fraction * angleRange;
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;

  // Needle endpoint
  const rad = (angle * Math.PI) / 180;
  const nx = cx + Math.cos(rad) * (r - 4);
  const ny = cy + Math.sin(rad) * (r - 4);

  // Scale ticks
  const ticks = [];
  const tickCount = 8;
  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;
    const a = ((startAngle + t * angleRange) * Math.PI) / 180;
    const x1 = cx + Math.cos(a) * (r - 1);
    const y1 = cy + Math.sin(a) * (r - 1);
    const x2 = cx + Math.cos(a) * (r - (i % 2 === 0 ? 11 : 7));
    const y2 = cy + Math.sin(a) * (r - (i % 2 === 0 ? 11 : 7));
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#444" strokeWidth={i % 2 === 0 ? 2 : 1} />);
  }

  // Arc background
  const arcStart = (startAngle * Math.PI) / 180;
  const arcEnd = ((startAngle + angleRange) * Math.PI) / 180;
  const arcPath = `M ${cx + Math.cos(arcStart) * r} ${cy + Math.sin(arcStart) * r} A ${r} ${r} 0 1 1 ${cx + Math.cos(arcEnd) * r} ${cy + Math.sin(arcEnd) * r}`;

  // Filled arc
  const filledEnd = ((startAngle + fraction * angleRange) * Math.PI) / 180;
  const largeArc = fraction * angleRange > 180 ? 1 : 0;
  const filledPath = `M ${cx + Math.cos(arcStart) * r} ${cy + Math.sin(arcStart) * r} A ${r} ${r} 0 ${largeArc} 1 ${cx + Math.cos(filledEnd) * r} ${cy + Math.sin(filledEnd) * r}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="#1a1a1a" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="#222" strokeWidth={1} />
        {/* Face */}
        <circle cx={cx} cy={cy} r={r} fill="#090909" stroke="#333" strokeWidth={0.5} />
        {/* Arc track */}
        <path d={arcPath} fill="none" stroke="#1a1a1a" strokeWidth={3} strokeLinecap="round" />
        {/* Filled arc */}
        <path d={filledPath} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
        {/* Ticks */}
        {ticks}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={color} strokeWidth={2}
          style={{ filter: `drop-shadow(0 0 3px ${color})`, transition: 'all 0.3s ease' }}
        />
        {/* Center pin */}
        <circle cx={cx} cy={cy} r={4} fill="#333" stroke={color} strokeWidth={1.5} />
        {/* Value */}
        <text x={cx} y={cy + 18} textAnchor="middle"
          style={{ fontFamily: 'var(--font-share-tech-mono), monospace', fontSize: '11px', fill: color }}
        >{value.toFixed(0)}</text>
      </svg>
      <span style={{
        fontFamily: 'var(--font-share-tech-mono), monospace',
        fontSize: '0.75rem',
        color,
        marginTop: '0px',
        letterSpacing: '1px',
        fontWeight: 'bold',
      }}>{label}</span>
    </div>
  );
}

/* ─── LED status indicator ─── */
function StatusLED({ active, color, label }: { active: boolean; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: 10, height: 10,
        background: active ? color : '#1a1a1a',
        boxShadow: active ? `0 0 6px ${color}` : 'none',
        border: `1px solid ${active ? color : '#333'}`,
        transition: 'all 0.3s',
      }} />
      <span style={{
        fontFamily: 'var(--font-share-tech-mono), monospace',
        fontSize: '0.7rem',
        color: active ? color : '#444',
      }}>{label}</span>
    </div>
  );
}

/* ─── Rod depth bar (selsyn-style horizontal) ─── */
function RodDepthBar({ label, value, max, color, disabled, effectUp, effectDown, modeTag, onChange, onStep }: {
  label: string; value: number; max: number; color: string; disabled?: boolean;
  effectUp: string; effectDown: string; modeTag?: string;
  onChange: (v: number) => void; onStep: (d: number) => void;
}) {
  const fraction = value / max;

  return (
    <div style={{
      padding: '8px 10px',
      background: disabled ? '#090909' : '#0a0a0a',
      border: `1px solid ${disabled ? '#151515' : '#1e1e1e'}`,
      opacity: disabled ? 0.5 : 1,
    }}>
      {/* Label row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '3px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 8, height: 8, background: color, boxShadow: `0 0 4px ${color}` }} />
          <span style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.85rem',
            color,
            fontWeight: 'bold',
            letterSpacing: '1px',
          }}>{label}</span>
          {modeTag && (
            <span style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.6rem',
              padding: '1px 5px',
              border: `1px solid ${color}44`,
              color,
              background: `${color}10`,
              letterSpacing: '0.5px',
            }}>{modeTag}</span>
          )}
        </div>
        <span className="seven-segment" style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '1.2rem',
          color,
        }}>
          {value.toFixed(0)}<span style={{ fontSize: '0.65rem', color: '#444' }}>/{max}</span>
        </span>
      </div>

      {/* Depth bar — styled like SelsynPanel */}
      <div style={{
        height: '20px',
        background: '#060606',
        border: '1px solid #222',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '3px',
      }}>
        {/* Scale marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((m, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${m * 100}%`,
            top: 0, bottom: 0,
            width: '1px',
            background: '#1a1a1a',
          }} />
        ))}
        {/* Fill */}
        <div style={{
          position: 'absolute',
          top: 1, bottom: 1, left: 0,
          width: `${fraction * 100}%`,
          background: `linear-gradient(90deg, ${color}55, ${color}aa)`,
          transition: 'width 0.3s ease',
        }} />
        {/* Marker needle */}
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: `${fraction * 100}%`,
          width: '2px',
          background: '#ddd',
          opacity: 0.7,
          transition: 'left 0.3s ease',
          boxShadow: '0 0 3px rgba(255,255,255,0.3)',
        }} />
      </div>

      {!disabled && (
        <>
          {/* Slider track */}
          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              appearance: 'none',
              background: `linear-gradient(to right, ${color}66 ${fraction * 100}%, #1a1a1a ${fraction * 100}%)`,
              cursor: 'pointer',
              border: 'none',
              marginBottom: '3px',
            }}
          />

          {/* Step buttons — industrial push-button style */}
          <div style={{ display: 'flex', gap: '2px', marginBottom: '3px' }}>
            {[
              { delta: -5, text: '▼▼' },
              { delta: -1, text: '▼' },
              { delta: 1, text: '▲' },
              { delta: 5, text: '▲▲' },
            ].map(btn => (
              <button
                key={btn.delta}
                onClick={() => onStep(btn.delta)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  background: '#0c0c0c',
                  border: '1px solid #2a2a2a',
                  borderBottom: '2px solid #1a1a1a',
                  color,
                  fontFamily: 'var(--font-share-tech-mono), monospace',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLElement).style.borderBottom = '1px solid #1a1a1a';
                  (e.target as HTMLElement).style.marginTop = '1px';
                }}
                onMouseUp={(e) => {
                  (e.target as HTMLElement).style.borderBottom = '2px solid #1a1a1a';
                  (e.target as HTMLElement).style.marginTop = '0px';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderBottom = '2px solid #1a1a1a';
                  (e.target as HTMLElement).style.marginTop = '0px';
                }}
              >
                {btn.text}
              </button>
            ))}
          </div>

          {/* Effect annotations — engraved placard style */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <div style={{
              flex: 1,
              padding: '4px 6px',
              background: '#060806',
              border: '1px solid #1a261a',
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.65rem',
              color: '#4a6a4a',
              lineHeight: 1.4,
              borderLeft: '3px solid #2a4a2a',
            }}>
              <span style={{ fontWeight: 'bold', color: '#5a8a5a' }}>▲ EINFAHREN:</span> {effectDown}
            </div>
            <div style={{
              flex: 1,
              padding: '4px 6px',
              background: '#080606',
              border: '1px solid #261a1a',
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.65rem',
              color: '#6a4a4a',
              lineHeight: 1.4,
              borderLeft: '3px solid #4a2a2a',
            }}>
              <span style={{ fontWeight: 'bold', color: '#8a5a5a' }}>▼ AUSFAHREN:</span> {effectUp}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


export default function ControlRodPanel({
  controlRods,
  manualRods,
  autoRods,
  shortenedRods,
  safetyRods,
  powerMode,
  thermalPower,
  xenonConcentration,
  reactivityMargin,
  elapsedSeconds,
  dispatch,
}: ControlRodPanelProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('MR');
  const isWarning = controlRods < PHYSICS.MINIMUM_SAFE_RODS;
  const phase = getPhase(thermalPower, xenonConcentration, reactivityMargin, elapsedSeconds);
  const phaseInfo = getPhaseInfo(phase);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const groups = [
    { id: 'MR', label: 'MR', fullLabel: 'MR — MANUELL', value: manualRods, max: PHYSICS.MANUAL_RODS_MAX, color: '#00aaff',
      disabled: false, modeTag: undefined,
      effectUp: 'Leistung ↑ Neutronenfluss ↑', effectDown: 'Leistung ↓ Absorption ↑',
      onChange: (v: number) => dispatch({ type: 'SET_MANUAL_RODS', payload: v }),
      onStep: (d: number) => dispatch({ type: 'SET_MANUAL_RODS', payload: clamp(manualRods + d, 0, PHYSICS.MANUAL_RODS_MAX) }),
    },
    { id: 'AR', label: 'AR', fullLabel: 'AR — AUTOMATIK', value: autoRods, max: PHYSICS.AUTO_RODS_MAX, color: '#ffaa00',
      disabled: powerMode === 'auto', modeTag: powerMode === 'auto' ? 'LAR-AUTO' : 'HAND',
      effectUp: 'Feinregelung ↑ Leistung', effectDown: 'Feinregelung ↓ Leistung',
      onChange: (v: number) => dispatch({ type: 'SET_AUTO_RODS', payload: v }),
      onStep: (d: number) => dispatch({ type: 'SET_AUTO_RODS', payload: clamp(autoRods + d, 0, PHYSICS.AUTO_RODS_MAX) }),
    },
    { id: 'USP', label: 'USP', fullLabel: 'USP — VERKÜRZT', value: shortenedRods, max: PHYSICS.SHORTENED_RODS_MAX, color: '#ff44ff',
      disabled: false, modeTag: undefined,
      effectUp: 'Unterer Kern weniger absorbiert', effectDown: 'Gleichmäßigere Flussverteilung',
      onChange: (v: number) => dispatch({ type: 'SET_SHORTENED_RODS', payload: v }),
      onStep: (d: number) => dispatch({ type: 'SET_SHORTENED_RODS', payload: clamp(shortenedRods + d, 0, PHYSICS.SHORTENED_RODS_MAX) }),
    },
    { id: 'AZ', label: 'AZ', fullLabel: 'AZ — SICHERHEIT', value: safetyRods, max: PHYSICS.SAFETY_RODS_MAX, color: '#ff2222',
      disabled: true, modeTag: 'GESPERRT',
      effectUp: '', effectDown: '',
      onChange: () => {}, onStep: () => {},
    },
  ];

  const selected = groups.find(g => g.id === selectedGroup) ?? groups[0];

  return (
    <div
      style={{
        border: `1px solid ${isWarning ? 'var(--alarm-red)' : 'var(--border)'}`,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
      }}
      className={isWarning ? 'animate-border-flash' : ''}
    >
      {/* ─── Engraved panel header ─── */}
      <div style={{
        fontFamily: 'var(--font-share-tech-mono), monospace',
        fontSize: '0.95rem',
        padding: '8px 10px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)',
        borderTop: '1px solid #1a1a1a',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--amber)' }}>
          STEUERSTÄBE
          <InfoTooltip text={`Steuerstäbe regulieren die Kettenreaktion durch Absorption von Neutronen.

MR: Manuelle Regelstäbe — Hauptsteuerung
AR: Automatik-Regelstäbe — LAR-System (historisch korrekt)
USP: Verkürzte Absorberstäbe — von unten eingeführt
AZ: Sicherheitsstäbe — nur bei Notabschaltung

OZR-Minimum: ${PHYSICS.MINIMUM_SAFE_RODS} Stabäquivalente`} />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isWarning && (
            <span className="animate-pulse-alarm" style={{ color: 'var(--alarm-red)', fontSize: '0.8rem' }}>
              ⚠ OZR
            </span>
          )}
          <span className="seven-segment" style={{
            fontSize: '1.4rem',
            color: isWarning ? 'var(--alarm-red)' : 'var(--amber)',
          }}>
            {controlRods}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#444' }}>/{PHYSICS.MAX_CONTROL_RODS}</span>
        </div>
      </div>

      {/* ─── Gauge cluster — 4 analog gauges ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 6px 6px',
        background: '#0a0a0a',
        borderBottom: '1px solid #1a1a1a',
      }}>
        {groups.map(g => (
          <div
            key={g.id}
            onClick={() => !g.disabled && setSelectedGroup(g.id)}
            style={{
              cursor: g.disabled ? 'default' : 'pointer',
              padding: '4px',
              border: selectedGroup === g.id && !g.disabled ? `1px solid ${g.color}44` : '1px solid transparent',
              background: selectedGroup === g.id && !g.disabled ? `${g.color}06` : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <AnalogGauge
              value={g.value}
              max={g.max}
              label={g.label}
              color={g.color}
              size={96}
            />
          </div>
        ))}
      </div>

      {/* ─── Status LEDs row ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '6px 10px',
        background: '#080808',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <StatusLED active={powerMode === 'auto'} color="#ffaa00" label="LAR-AUTO" />
        <StatusLED active={controlRods < PHYSICS.OZR_WARNING} color="var(--warning-yellow)" label="OZR↓" />
        <StatusLED active={controlRods < PHYSICS.MINIMUM_SAFE_RODS} color="var(--alarm-red)" label="OZR MIN" />
        <StatusLED active={xenonConcentration > 0.5} color="#ff44ff" label="Xe HOCH" />
      </div>

      {/* ─── Phase guidance — operator placard ─── */}
      <div style={{
        padding: '6px 10px',
        borderBottom: '1px solid #1a1a1a',
        background: '#0b0b0b',
        fontFamily: 'var(--font-share-tech-mono), monospace',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: phaseInfo.color,
            padding: '2px 6px',
            border: `1px solid ${phaseInfo.color}44`,
            background: `${phaseInfo.color}0a`,
            letterSpacing: '1px',
          }}>
            {phaseInfo.label}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#555' }}>{thermalPower.toFixed(0)} MW</span>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '3px', lineHeight: 1.3 }}>
          {phaseInfo.goal} — <span style={{ color: '#888' }}>{phaseInfo.instruction}</span>
        </div>
      </div>

      {/* ─── Selected group detail control ─── */}
      <div style={{ padding: '6px', overflow: 'auto', flex: 1 }}>
        <RodDepthBar
          label={selected.fullLabel}
          value={selected.value}
          max={selected.max}
          color={selected.color}
          disabled={selected.disabled}
          modeTag={selected.modeTag}
          effectUp={selected.effectUp}
          effectDown={selected.effectDown}
          onChange={selected.onChange}
          onStep={selected.onStep}
        />
      </div>
    </div>
  );
}
