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
}

const SCALE_MARKS = [0, 1, 2, 3, 4, 5, 6, 7];
const QUADRANT_LABELS: Quadrant[] = ['NW', 'NE', 'SW', 'SE'];

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

      {/* Quadrant balance table */}
      <div style={{
        marginTop: '6px',
        borderTop: '1px solid var(--border)',
        paddingTop: '4px',
      }}>
        <div style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.6rem',
          color: '#666',
          marginBottom: '3px',
        }}>
          QUADRANT-BALANCE (RR Handregelung)
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2px',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.65rem',
        }}>
          {QUADRANT_LABELS.map(q => {
            const rrGroup = groups.find(g => g.type === 'RR');
            const qDepth = rrGroup ? rrGroup.quadrants[q] : 0;
            const deviation = rrGroup ? Math.abs(qDepth - rrGroup.depth) : 0;
            const devColor = deviation > 1.0 ? 'var(--alarm-red)' :
              deviation > 0.5 ? 'var(--warning-yellow)' : 'var(--safe-green)';

            return (
              <div key={q} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '1px 4px',
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
              }}>
                <span style={{ color: '#888' }}>{q}</span>
                <span style={{ color: devColor }}>{qDepth.toFixed(1)}m</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
