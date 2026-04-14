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

/* SVG arc gauge dial for instrument panel — RBMK-1000 Chernobyl style */
function GaugeDial({ cx, cy, r, value, max, label, unit, warnAt, critAt, inverse }: {
  cx: number; cy: number; r: number;
  value: number; max: number;
  label: string; unit: string;
  warnAt: number; critAt: number;
  inverse?: boolean;  // true = low values are alarming (e.g. OZR)
}) {
  const clamp = Math.min(Math.max(0, value), max);
  const ratio = clamp / max;
  const startAngle = -210;
  const sweep = 240;
  const endAngle = startAngle + sweep * ratio;
  const tw = r * 0.15;  // track width

  const warnRatio = warnAt / max;
  const critRatio = critAt / max;
  const warnAngle = startAngle + sweep * warnRatio;
  const critAngle = startAngle + sweep * critRatio;

  // inverse=true: low values are dangerous (OZR — want to stay HIGH)
  const color = inverse
    ? (value <= critAt ? '#ff2020' : value <= warnAt ? '#ffd700' : '#00ff41')
    : (value >= critAt ? '#ff2020' : value >= warnAt ? '#ffd700' : '#00ff41');

  const toRad = (d: number) => (d * Math.PI) / 180;
  const px = (a: number, rad: number) => cx + Math.cos(toRad(a)) * rad;
  const py = (a: number, rad: number) => cy + Math.sin(toRad(a)) * rad;

  const arcPath = (from: number, to: number, rad: number) => {
    if (Math.abs(to - from) < 0.1) return '';
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${px(from, rad)} ${py(from, rad)} A ${rad} ${rad} 0 ${large} 1 ${px(to, rad)} ${py(to, rad)}`;
  };

  const fmt = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0);

  const valueFontSize = r * 0.34;
  const unitFontSize = r * 0.175;
  const labelFontSize = r * 0.195;
  const tickFontSize = r * 0.155;

  // Zone arc paths: inverse → red at low end, green at high end
  const zoneNorm = inverse
    ? arcPath(warnAngle, startAngle + sweep, r)
    : arcPath(startAngle, warnAngle, r);
  const zoneWarn = inverse
    ? arcPath(critAngle, warnAngle, r)
    : arcPath(warnAngle, critAngle, r);
  const zoneCrit = inverse
    ? arcPath(startAngle, critAngle, r)
    : arcPath(critAngle, startAngle + sweep, r);

  const outerR = r + tw + 6;  // radius for "0" / "max" labels

  return (
    <g>
      {/* Backing disc */}
      <circle cx={cx} cy={cy} r={r + tw + 2}
        fill="#060606" stroke="#1c1c1c" strokeWidth="0.8" />

      {/* Zone background arcs (green / yellow / red) */}
      {zoneNorm && <path d={zoneNorm} fill="none" stroke="rgba(0,255,65,0.18)"   strokeWidth={tw} strokeLinecap="round" />}
      {zoneWarn && <path d={zoneWarn} fill="none" stroke="rgba(255,215,0,0.18)"  strokeWidth={tw} strokeLinecap="round" />}
      {zoneCrit && <path d={zoneCrit} fill="none" stroke="rgba(255,32,32,0.18)"  strokeWidth={tw} strokeLinecap="round" />}

      {/* Dark centre-line on track for depth */}
      <path d={arcPath(startAngle, startAngle + sweep, r)}
        fill="none" stroke="#0c0c0c" strokeWidth={tw * 0.38} strokeLinecap="round" />

      {/* Active value arc */}
      {ratio > 0.005 && (
        <path d={arcPath(startAngle, endAngle, r)}
          fill="none" stroke={color} strokeWidth={tw * 0.65} strokeLinecap="round" />
      )}

      {/* Threshold markers — short lines crossing the track */}
      <line x1={px(warnAngle, r - tw * 0.6)} y1={py(warnAngle, r - tw * 0.6)}
        x2={px(warnAngle, r + tw * 0.6)} y2={py(warnAngle, r + tw * 0.6)}
        stroke="#ffd700" strokeWidth="1.6" />
      <line x1={px(critAngle, r - tw * 0.6)} y1={py(critAngle, r - tw * 0.6)}
        x2={px(critAngle, r + tw * 0.6)} y2={py(critAngle, r + tw * 0.6)}
        stroke="#ff2020" strokeWidth="1.6" />

      {/* Arc-end tick marks (scale origin / scale max) */}
      <line x1={px(startAngle,         r - tw * 0.5)} y1={py(startAngle,         r - tw * 0.5)}
        x2={px(startAngle,         r + tw * 0.5)} y2={py(startAngle,         r + tw * 0.5)}
        stroke="#444" strokeWidth="0.9" />
      <line x1={px(startAngle + sweep, r - tw * 0.5)} y1={py(startAngle + sweep, r - tw * 0.5)}
        x2={px(startAngle + sweep, r + tw * 0.5)} y2={py(startAngle + sweep, r + tw * 0.5)}
        stroke="#444" strokeWidth="0.9" />

      {/* "0" and max value labels outside the arc ends */}
      <text x={px(startAngle,         outerR)} y={py(startAngle,         outerR) + 2}
        textAnchor="middle" fill="#444" fontSize={tickFontSize} fontFamily="monospace">0</text>
      <text x={px(startAngle + sweep, outerR)} y={py(startAngle + sweep, outerR) + 2}
        textAnchor="middle" fill="#444" fontSize={tickFontSize} fontFamily="monospace">{fmt(max)}</text>

      {/* Needle */}
      <line x1={cx} y1={cy}
        x2={px(endAngle, r - tw - 2)} y2={py(endAngle, r - tw - 2)}
        stroke={color} strokeWidth={Math.max(1.5, r * 0.045)} strokeLinecap="round" />

      {/* Hub */}
      <circle cx={cx} cy={cy} r={Math.max(3.5, r * 0.09)} fill={color} opacity="0.9" />

      {/* Value backing rect */}
      <rect x={cx - r * 0.42} y={cy - r * 0.25}
        width={r * 0.84} height={r * 0.44} rx="2"
        fill="#070707" stroke={`${color}44`} strokeWidth="0.6" />

      {/* Main value readout */}
      <text x={cx} y={cy + r * 0.09} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={valueFontSize} fontFamily="monospace" fontWeight="bold">
        {fmt(value)}
      </text>

      {/* Threshold labels in gauge "mouth" (below centre) */}
      <text x={cx - r * 0.08} y={cy + r * 0.56} textAnchor="end"
        fill="#ffd700" fontSize={tickFontSize} fontFamily="monospace">W:{fmt(warnAt)}</text>
      <text x={cx + r * 0.08} y={cy + r * 0.56} textAnchor="start"
        fill="#ff2020" fontSize={tickFontSize} fontFamily="monospace">K:{fmt(critAt)}</text>

      {/* Unit */}
      <text x={cx} y={cy + r * 0.76} textAnchor="middle"
        fill="#555" fontSize={unitFontSize} fontFamily="monospace">{unit}</text>

      {/* Gauge name label */}
      <text x={cx} y={cy + r + r * 0.38} textAnchor="middle"
        fill="#888" fontSize={labelFontSize} fontFamily="monospace">{label}</text>
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
    { id: 'power',          cx: 70,  cy: 68,  value: thermalPower,       max: PHYSICS.MAX_THERMAL_POWER,          label: 'LEISTUNG',  unit: 'MWth',   warnAt: PHYSICS.TEST_POWER_MAX,              critAt: PHYSICS.MAX_THERMAL_POWER * 0.8, inverse: false },
    { id: 'coolant-temp',   cx: 210, cy: 68,  value: coolantTemperature, max: 350,                                label: 'KM-TEMP',   unit: '°C',     warnAt: PHYSICS.COOLANT_TEMP_BOILING - 4,    critAt: PHYSICS.COOLANT_TEMP_BOILING,    inverse: false },
    { id: 'fuel-temp',      cx: 350, cy: 68,  value: fuelTemperature,    max: PHYSICS.FUEL_TEMP_MELTDOWN,         label: 'BE-TEMP',   unit: '°C',     warnAt: PHYSICS.FUEL_TEMP_WARNING,           critAt: PHYSICS.FUEL_TEMP_MELTDOWN * 0.7,inverse: false },
    { id: 'steam-pressure', cx: 70,  cy: 198, value: steamPressure,      max: PHYSICS.STEAM_PRESSURE_CRITICAL * 1.2, label: 'DAMPFDR.', unit: 'bar', warnAt: PHYSICS.STEAM_PRESSURE_WARNING,     critAt: PHYSICS.STEAM_PRESSURE_CRITICAL, inverse: false },
    { id: 'neutron-flux',   cx: 210, cy: 198, value: neutronFlux,        max: 100,                                label: 'N-FLUSS',   unit: '%',      warnAt: 70,                                  critAt: 90,                              inverse: false },
    { id: 'ozr',            cx: 350, cy: 198, value: reactivityMargin,   max: 80,                                 label: 'OZR',       unit: 'St.Äq.', warnAt: PHYSICS.OZR_WARNING,                 critAt: PHYSICS.OZR_MINIMUM_SAFE,        inverse: true  },
  ];

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
        <svg viewBox="0 0 420 264" width="100%" style={{ display: 'block' }}>
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
              inverse={gauge.inverse}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
