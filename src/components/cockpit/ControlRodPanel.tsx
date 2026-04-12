'use client';

import { PHYSICS } from '@/lib/physics/constants';

interface ControlRodPanelProps {
  controlRods: number;
  dispatch: React.Dispatch<{ type: 'SET_CONTROL_RODS'; payload: number }>;
}

const ROD_GROUPS = [
  { label: 'STABGRUPPE I', count: 35 },
  { label: 'STABGRUPPE II', count: 35 },
  { label: 'STABGRUPPE III', count: 35 },
  { label: 'STABGRUPPE IV', count: 35 },
  { label: 'STABGRUPPE V', count: 36 },
  { label: 'STABGRUPPE VI', count: 35 },
];

const TOTAL_RODS = ROD_GROUPS.reduce((s, g) => s + g.count, 0); // 211

export default function ControlRodPanel({ controlRods, dispatch }: ControlRodPanelProps) {
  const isWarning = controlRods < PHYSICS.MINIMUM_SAFE_RODS;

  const handleGroupChange = (groupIndex: number, value: number) => {
    const groupFractions = ROD_GROUPS.map((g, i) => {
      if (i === groupIndex) return value / g.count;
      return getGroupValue(i) / g.count;
    });
    const total = ROD_GROUPS.reduce((sum, g, i) => sum + Math.round(g.count * groupFractions[i]), 0);
    dispatch({ type: 'SET_CONTROL_RODS', payload: Math.min(TOTAL_RODS, total) });
  };

  const getGroupValue = (groupIndex: number): number => {
    const fraction = controlRods / TOTAL_RODS;
    return Math.round(ROD_GROUPS[groupIndex].count * fraction);
  };

  return (
    <div
      style={{
        border: `1px solid ${isWarning ? 'var(--alarm-red)' : 'var(--border)'}`,
        padding: '12px',
        background: 'var(--surface)',
      }}
      className={isWarning ? 'animate-border-flash' : ''}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.85rem',
          marginBottom: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '6px',
        }}
      >
        STEUERSTÄBE: {controlRods}/{PHYSICS.MAX_CONTROL_RODS}
        {isWarning && (
          <span className="animate-pulse-alarm" style={{ color: 'var(--alarm-red)', marginLeft: '8px' }}>
            ⚠ MINIMUM UNTERSCHRITTEN
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around' }}>
        {ROD_GROUPS.map((group, i) => {
          const groupVal = getGroupValue(i);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-share-tech-mono), monospace',
                  fontSize: '1.2rem',
                  color: isWarning ? 'var(--alarm-red)' : 'var(--amber)',
                }}
              >
                {groupVal}
              </span>
              <input
                type="range"
                className="vertical-slider"
                min={0}
                max={group.count}
                value={groupVal}
                onChange={(e) => handleGroupChange(i, Number(e.target.value))}
                style={{
                  ...(isWarning ? { borderColor: 'var(--alarm-red)' } : {}),
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-share-tech-mono), monospace',
                  fontSize: '0.6rem',
                  color: '#666',
                  textAlign: 'center',
                  width: '48px',
                }}
              >
                {group.label.split(' ')[1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
