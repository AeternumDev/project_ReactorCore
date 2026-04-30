'use client';

import { useEffect, useRef } from 'react';
import { GameEvent } from '@/lib/physics/types';

interface EventLogProps {
  events: GameEvent[];
  onAlarm?: (hasAlarm: boolean) => void;
}

/**
 * Scenario clock — the historical Chernobyl turbine rundown test began at
 * roughly 01:23:04 on 26 April 1986. We anchor the simulation clock so that
 * t=0 in the engine reads as a wall-clock time the operator would actually
 * have written into the journal.
 */
const SCENARIO_START_HOUR = 1;
const SCENARIO_START_MINUTE = 22;
const SCENARIO_START_SECOND = 30;
const SCENARIO_START_TOTAL_SECONDS =
  SCENARIO_START_HOUR * 3600 + SCENARIO_START_MINUTE * 60 + SCENARIO_START_SECOND;

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(SCENARIO_START_TOTAL_SECONDS + seconds));
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const severityStyles: Record<GameEvent['severity'], React.CSSProperties> = {
  info: { color: '#888' },
  warning: { color: 'var(--warning-yellow)' },
  critical: { color: 'var(--alarm-red)' },
  alarm: { color: 'var(--alarm-red)', fontWeight: 'bold' },
};

const severityLabel: Record<GameEvent['severity'], string> = {
  info: 'INFO',
  warning: 'WARN',
  critical: 'KRIT',
  alarm: 'ALRM',
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
          fontSize: '0.9rem',
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
          fontSize: '0.8rem',
          lineHeight: '1.5',
        }}
      >
        {reversed.length === 0 && (
          <div style={{ color: '#444' }}>Keine Ereignisse.</div>
        )}
        {reversed.map((event, i) => {
          const isNewest = i === 0;
          const baseClass = 'event-row event-row-in';
          const className = event.severity === 'alarm'
            ? `${baseClass} animate-pulse-alarm`
            : baseClass;
          // Stable key (original event index) so existing rows don't re-mount
          // — and re-trigger the slide-in animation — when new events arrive.
          const stableKey = `${events.length - 1 - i}-${event.timestamp.toFixed(2)}`;
          return (
            <div
              key={stableKey}
              className={className}
              style={{
                ...severityStyles[event.severity],
                padding: '3px 4px',
                borderLeft: `2px solid ${isNewest ? 'currentColor' : 'transparent'}`,
                marginBottom: '2px',
              }}
            >
              <span style={{ opacity: 0.7 }}>[{formatTimestamp(event.timestamp)}]</span>{' '}
              <span style={{ opacity: 0.7 }}>{severityLabel[event.severity]}</span>{' '}
              {event.message}
            </div>
          );
        })}
      </div>
    </div>
  );
}

