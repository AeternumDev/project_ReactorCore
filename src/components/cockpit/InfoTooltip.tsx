'use client';

import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<'below' | 'above'>('below');
  const iconRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceBelow < 160 ? 'above' : 'below');
    }
  }, [visible]);

  return (
    <span
      ref={iconRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '14px',
        height: '14px',
        border: '1px solid #555',
        fontSize: '0.65rem',
        color: '#888',
        cursor: 'help',
        flexShrink: 0,
        marginLeft: '6px',
      }}
    >
      ?
      {visible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            ...(position === 'below'
              ? { top: '20px' }
              : { bottom: '20px' }),
            width: '260px',
            padding: '10px',
            background: '#1a1a1a',
            border: '1px solid var(--amber)',
            boxShadow: '0 0 12px rgba(255,140,0,0.15)',
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.7rem',
            lineHeight: '1.5',
            color: '#ccc',
            zIndex: 1000,
            pointerEvents: 'none',
            whiteSpace: 'pre-line',
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
