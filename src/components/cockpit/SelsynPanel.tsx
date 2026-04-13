'use client';

import { useMemo } from 'react';
import {
  RODS, ROD_COLORS, RodType, ROD_TYPE_LABELS, Quadrant,
  getRodDepthMeters, getRodAlarmState, getQuadrantBalance,
  RodAlarmState,
} from './coreLayout';
import { PHYSICS } from '@/lib/physics/constants';

interface SelsynPanelProps {
  manualRods: number;
  autoRods: number;
  shortenedRods: number;
  safetyRods: number;
  thermalPower: number;
  isExploded: boolean;
  az5Active: boolean;
  az5Timer: number;
  coolantTemperature: number;
  fuelTemperature: number;
  steamPressure: number;
  neutronFlux: number;
  reactivityMargin: number;
}

const SCALE_MARKS = [0, 1, 2, 3, 4, 5, 6, 7];

/* SVG arc gauge dial for instrument panel */
function GaugeDial({ cx, cy, r, value, max, label, unit, warnAt, critAt }: {
  cx: number; cy: number; r: number;
  value: number; max: number;
  label: string; unit: string;
  warnAt: number; critAt: number;
}) {
  const clamp = Math.min(value, max);
  const ratio = clamp / max;
  const startAngle = -210;
  const sweep = 240;
  const endAngle = startAngle + sweep * ratio;
  const trackWidth = Math.max(4, r * 0.12);
  const needleWidth = Math.max(1.5, r * 0.04);
  const hubRadius = Math.max(3, r * 0.08);
  const valueFontSize = r * 0.32;
  const unitFontSize = r * 0.17;
  const labelFontSize = r * 0.19;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const px = (a: number, rad: number) => cx + Math.cos(toRad(a)) * rad;
  const py = (a: number, rad: number) => cy + Math.sin(toRad(a)) * rad;

  const arcPath = (from: number, to: number, rad: number) => {
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${px(from, rad)} ${py(from, rad)} A ${rad} ${rad} 0 ${large} 1 ${px(to, rad)} ${py(to, rad)}`;
  };

  const color = value >= critAt ? '#ff2020' : value >= warnAt ? '#ffd700' : '#00ff41';

  return (
    <g>
      {/* Track */}
      <path d={arcPath(startAngle, startAngle + sweep, r)}
        fill="none" stroke="#1a1a1a" strokeWidth={trackWidth} strokeLinecap="round" />
      {/* Warning zone */}
      <path d={arcPath(startAngle + sweep * (warnAt / max), startAngle + sweep, r)}
        fill="none" stroke="rgba(255,215,0,0.12)" strokeWidth={trackWidth} strokeLinecap="round" />
      {/* Critical zone */}
      <path d={arcPath(startAngle + sweep * (critAt / max), startAngle + sweep, r)}
        fill="none" stroke="rgba(255,32,32,0.12)" strokeWidth={trackWidth} strokeLinecap="round" />
      {/* Value arc */}
      {ratio > 0.005 && (
        <path d={arcPath(startAngle, endAngle, r)}
          fill="none" stroke={color} strokeWidth={trackWidth} strokeLinecap="round" />
      )}
      {/* Tick marks */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const a = startAngle + sweep * t;
        return (
          <line key={i}
            x1={px(a, r - 3)} y1={py(a, r - 3)}
            x2={px(a, r + 1)} y2={py(a, r + 1)}
            stroke="#444" strokeWidth="0.6" />
        );
      })}
      {/* Needle */}
      <line x1={cx} y1={cy}
        x2={px(endAngle, r - 4)} y2={py(endAngle, r - 4)}
        stroke={color} strokeWidth={needleWidth} />
      <circle cx={cx} cy={cy} r={hubRadius} fill={color} />
      {/* Value */}
      <text x={cx} y={cy + 8} textAnchor="middle" fill={color}
        fontSize={valueFontSize} fontFamily="monospace" fontWeight="bold">
        {value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0)}
      </text>
      <text x={cx} y={cy + r * 0.42} textAnchor="middle" fill="#555"
        fontSize={unitFontSize} fontFamily="monospace">{unit}</text>
      {/* Label */}
      <text x={cx} y={cy + r + r * 0.34} textAnchor="middle" fill="#777"
        fontSize={labelFontSize} fontFamily="monospace">{label}</text>
    </g>
  );
}

interface GroupData {
  type: RodType;
  count: number;
  depth: number;
  alarm: RodAlarmState;
  quadrants: Record<Quadrant, number>;
  maxDeviation: number;
}

export default function SelsynPanel({
  manualRods,
  autoRods,
  shortenedRods,
  safetyRods,
  thermalPower,
  isExploded,
  az5Active,
  az5Timer,
  coolantTemperature,
  fuelTemperature,
  steamPressure,
  neutronFlux,
  reactivityMargin,
}: SelsynPanelProps) {
  const groups = useMemo((): GroupData[] => {
    const typeOrder: RodType[] = ['AZ', 'AR', 'RR', 'LAR', 'USP'];

    return typeOrder.map(type => {
      const rodsOfType = RODS.filter(r => r.type === type);
      if (rodsOfType.length === 0) {
        return {
          type, count: 0, depth: 0, alarm: 'normal' as RodAlarmState,
          quadrants: { NW: 0, NE: 0, SW: 0, SE: 0 }, maxDeviation: 0,
        };
      }

      const groupDepth = getRodDepthMeters(
        type, manualRods, autoRods, shortenedRods, safetyRods,
        az5Active, az5Timer, isExploded,
      );

      const getDepth = () => groupDepth;
      const balance = getQuadrantBalance(rodsOfType, getDepth);
      const alarm = getRodAlarmState(groupDepth, type);

      return {
        type,
        count: rodsOfType.length,
        depth: groupDepth,
        alarm,
        quadrants: balance.quadrants,
        maxDeviation: balance.maxDeviation,
      };
    }).filter(g => g.count > 0);
  }, [manualRods, autoRods, shortenedRods, safetyRods, az5Active, az5Timer, isExploded]);

  const totalRods = RODS.length;
  const avgDepth = groups.reduce((s, g) => s + g.depth * g.count, 0) / Math.max(1, totalRods);
  const gauges = [
    {
      id: 'power',
      cx: 70,
      cy: 60,
      value: thermalPower,
      max: PHYSICS.MAX_THERMAL_POWER,
      label: 'LEISTUNG',
      unit: 'MWth',
      warnAt: PHYSICS.TEST_POWER_MAX,
      critAt: PHYSICS.MAX_THERMAL_POWER * 0.8,
    },
    {
      id: 'coolant-temp',
      cx: 210,
      cy: 60,
      value: coolantTemperature,
      max: 350,
      label: 'KM-TEMP',
      unit: '°C',
      warnAt: PHYSICS.COOLANT_TEMP_BOILING - 4,
      critAt: PHYSICS.COOLANT_TEMP_BOILING,
    },
    {
      id: 'fuel-temp',
      cx: 350,
      cy: 60,
      value: fuelTemperature,
      max: PHYSICS.FUEL_TEMP_MELTDOWN,
      label: 'BE-TEMP',
      unit: '°C',
      warnAt: PHYSICS.FUEL_TEMP_WARNING,
      critAt: PHYSICS.FUEL_TEMP_MELTDOWN * 0.7,
    },
    {
      id: 'steam-pressure',
      cx: 70,
      cy: 188,
      value: steamPressure,
      max: PHYSICS.STEAM_PRESSURE_CRITICAL * 1.2,
      label: 'DAMPFDR.',
      unit: 'bar',
      warnAt: PHYSICS.STEAM_PRESSURE_WARNING,
      critAt: PHYSICS.STEAM_PRESSURE_CRITICAL,
    },
    {
      id: 'neutron-flux',
      cx: 210,
      cy: 188,
      value: neutronFlux,
      max: 100,
      label: 'N-FLUSS',
      unit: '%',
      warnAt: 70,
      critAt: 90,
    },
    {
      id: 'ozr',
      cx: 350,
      cy: 188,
      value: reactivityMargin,
      max: 80,
      label: 'OZR',
      unit: 'St.Äq.',
      warnAt: PHYSICS.OZR_WARNING,
      critAt: PHYSICS.OZR_MINIMUM_SAFE,
    },
  ] as const;

  const alarmColor = (alarm: RodAlarmState) => {
    if (alarm === 'alarm') return 'var(--alarm-red)';
    if (alarm === 'warning') return 'var(--warning-yellow)';
    return 'var(--safe-green)';
  };

  return (
    <div style={{
      border: '1px solid var(--border)',
      padding: '8px',
      background: '#0a0f0a',
      flex: 1,
      minWidth: 0,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        fontFamily: 'var(--font-share-tech-mono), monospace',
        color: 'var(--amber)',
        fontSize: '0.85rem',
        marginBottom: '6px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '4px',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>SELSYN-TAFEL — Stabtiefentabelle</span>
        <span style={{ color: '#555', fontSize: '0.7rem' }}>
          ø {avgDepth.toFixed(1)}m / {totalRods} Stäbe
        </span>
      </div>

      {/* Scale header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '4px',
        fontFamily: 'var(--font-share-tech-mono), monospace',
        fontSize: '0.6rem',
        color: '#555',
      }}>
        <div style={{ width: '90px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
          {SCALE_MARKS.map(m => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div style={{ width: '85px', flexShrink: 0, textAlign: 'right' }}>m</div>
      </div>

      {/* Rod group rows */}
      {groups.map(g => {
        const color = ROD_COLORS[g.type];
        const fillPct = (g.depth / 7) * 100;
        const isUSP = g.type === 'USP';

        return (
          <div key={g.type} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '3px',
            gap: '4px',
          }}>
            {/* Type label + count */}
            <div style={{
              width: '90px',
              flexShrink: 0,
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <div style={{
                width: 6, height: 6,
                background: color,
                borderRadius: 1,
                boxShadow: `0 0 3px ${color}`,
                flexShrink: 0,
              }} />
              <span style={{ color }}>{g.type}</span>
              <span style={{ color: '#555' }}>×{g.count}</span>
            </div>

            {/* Depth bar */}
            <div style={{
              flex: 1,
              height: '16px',
              background: '#0a0a0a',
              border: '1px solid #2a2a2a',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Scale marks */}
              {SCALE_MARKS.map(m => (
                <div key={m} style={{
                  position: 'absolute',
                  left: `${(m / 7) * 100}%`,
                  top: 0, bottom: 0,
                  width: '1px',
                  background: '#1a1a1a',
                }} />
              ))}

              {/* Fill */}
              <div style={{
                position: 'absolute',
                top: 1, bottom: 1,
                ...(isUSP
                  ? { right: 0, width: `${fillPct}%` }
                  : { left: 0, width: `${fillPct}%` }
                ),
                background: color,
                opacity: 0.7,
                transition: 'width 0.4s ease',
              }} />

              {/* Depth marker */}
              <div style={{
                position: 'absolute',
                top: 0, bottom: 0,
                width: '2px',
                background: '#fff',
                ...(isUSP
                  ? { right: `${fillPct}%` }
                  : { left: `${fillPct}%` }
                ),
                opacity: 0.6,
                transition: 'left 0.4s ease, right 0.4s ease',
              }} />
            </div>

            {/* Depth value + alarm */}
            <div style={{
              width: '85px',
              flexShrink: 0,
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '0.7rem',
              textAlign: 'right',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '4px',
              alignItems: 'center',
            }}>
              <span style={{ color }}>{g.depth.toFixed(1)}m</span>
              <span style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: alarmColor(g.alarm),
                display: 'inline-block',
                boxShadow: g.alarm !== 'normal' ? `0 0 4px ${alarmColor(g.alarm)}` : 'none',
              }} />
            </div>
          </div>
        );
      })}

      {/* Instrument Gauges */}
      <div style={{
        marginTop: '6px',
        borderTop: '1px solid var(--border)',
        paddingTop: '4px',
      }}>
        <div style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.65rem',
          color: 'var(--amber)',
          marginBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>INSTRUMENTIERUNG</span>
          <span style={{ color: '#555', fontSize: '0.6rem' }}>ANALOG</span>
        </div>
        <svg viewBox="0 0 420 258" width="100%" style={{ display: 'block' }}>
          <defs>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {gauges.map((gauge) => (
            <GaugeDial
              key={gauge.id}
              cx={gauge.cx}
              cy={gauge.cy}
              r={46}
              value={gauge.value}
              max={gauge.max}
              label={gauge.label}
              unit={gauge.unit}
              warnAt={gauge.warnAt}
              critAt={gauge.critAt}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
