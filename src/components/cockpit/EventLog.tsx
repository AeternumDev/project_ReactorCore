'use client';

import { useEffect, useRef } from 'react';
import { GameEvent } from '@/lib/physics/types';

interface EventLogProps {
  events: GameEvent[];
  onAlarm?: (hasAlarm: boolean) => void;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const severityStyles: Record<GameEvent['severity'], React.CSSProperties> = {
  info: { color: '#666' },
  warning: { color: 'var(--warning-yellow)' },
  critical: { color: 'var(--alarm-red)' },
  alarm: { color: 'var(--alarm-red)', fontWeight: 'bold' },
};

export default function EventLog({ events, onAlarm }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  useEffect(() => {
    const hasAlarm = events.some((e) => e.severity === 'alarm');
    onAlarm?.(hasAlarm);
  }, [events, onAlarm]);

  const reversed = [...events].reverse();

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '12px',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
        EREIGNISPROTOKOLL — {events.length} EINTRÄGE
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.72rem',
          lineHeight: '1.6',
        }}
      >
        {reversed.length === 0 && (
          <div style={{ color: '#444' }}>Keine Ereignisse.</div>
        )}
        {reversed.map((event, i) => (
          <div
            key={i}
            style={severityStyles[event.severity]}
            className={event.severity === 'alarm' ? 'animate-pulse-alarm' : ''}
          >
            [{formatTimestamp(event.timestamp)}] {event.message}
          </div>
        ))}
      </div>
    </div>
  );
}
