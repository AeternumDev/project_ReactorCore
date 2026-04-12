'use client';

import { PHYSICS } from '@/lib/physics/constants';

interface StatusDisplayPanelProps {
  thermalPower: number;
  xenonConcentration: number;
  steamPressure: number;
  elapsedSeconds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getColorForPower(power: number): string {
  if (power > 1000) return 'var(--alarm-red)';
  if (power >= 700) return 'var(--safe-green)';
  return 'var(--amber)';
}

function getColorForXenon(xc: number): string {
  if (xc > 0.7) return 'var(--alarm-red)';
  if (xc > 0.4) return 'var(--warning-yellow)';
  return 'var(--amber)';
}

function getColorForPressure(p: number): string {
  if (p > PHYSICS.STEAM_PRESSURE_CRITICAL) return 'var(--alarm-red)';
  if (p > PHYSICS.STEAM_PRESSURE_WARNING) return 'var(--warning-yellow)';
  return 'var(--amber)';
}

interface DisplayProps {
  label: string;
  value: string;
  color: string;
  blink?: boolean;
}

function Display({ label, value, color, blink }: DisplayProps) {
  return (
    <div
      style={{
        border: '1px solid var(--amber)',
        background: 'var(--bg)',
        padding: '8px 12px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.6rem',
          color: '#666',
          marginBottom: '4px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        className={`seven-segment ${blink ? 'animate-blink' : ''}`}
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '2.2rem',
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function StatusDisplayPanel({
  thermalPower,
  xenonConcentration,
  steamPressure,
  elapsedSeconds,
}: StatusDisplayPanelProps) {
  const remaining = PHYSICS.TEST_DURATION_SECONDS - elapsedSeconds;
  const isLastMinute = remaining <= 60 && remaining > 0;

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '12px',
        background: 'var(--surface)',
      }}
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
        STATUSANZEIGEN
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Display
          label="REAKTORLEISTUNG"
          value={`${thermalPower.toFixed(0)} MW`}
          color={getColorForPower(thermalPower)}
        />
        <Display
          label="XENON-VERGIFTUNG"
          value={`${(xenonConcentration * 100).toFixed(1)}%`}
          color={getColorForXenon(xenonConcentration)}
        />
        <Display
          label="DAMPFDRUCK"
          value={`${steamPressure.toFixed(1)} bar`}
          color={getColorForPressure(steamPressure)}
        />
        <Display
          label="ÜBERLEBENSZEIT"
          value={formatTime(elapsedSeconds)}
          color="var(--safe-green)"
          blink={isLastMinute}
        />
      </div>
    </div>
  );
}
