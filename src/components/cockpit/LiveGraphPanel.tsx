'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface LiveGraphPanelProps {
  neutronFlux: number;
  coreTemperature: number;
  steamPressure: number;
}

interface DataPoint {
  tick: number;
  flux: number;
  temp: number;
  pressure: number;
}

const MAX_POINTS = 60;

const graphContainerStyle = {
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  padding: '4px 4px 0 0',
  marginBottom: '4px',
};

const labelStyle = {
  fontFamily: 'var(--font-share-tech-mono), monospace',
  fontSize: '0.75rem',
  color: 'var(--amber)',
  padding: '2px 8px',
  borderBottom: '1px solid var(--border)',
};

export default function LiveGraphPanel({ neutronFlux, coreTemperature, steamPressure }: LiveGraphPanelProps) {
  const [history, setHistory] = useState<DataPoint[]>([]);
  const tickRef = useRef(0);

  useEffect(() => {
    tickRef.current += 1;
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          tick: tickRef.current,
          flux: neutronFlux,
          temp: coreTemperature,
          pressure: steamPressure,
        },
      ];
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    });
  }, [neutronFlux, coreTemperature, steamPressure]);

  const tickStyle = {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 12,
    fill: '#666',
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '8px',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.9rem',
          marginBottom: '4px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '6px',
        }}
      >
        LIVE-MONITORING
      </div>

      {/* Neutron flux */}
      <div style={graphContainerStyle}>
        <div style={labelStyle}>NEUTRONENFLUSS (rel.)</div>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={history}>
            <XAxis dataKey="tick" hide />
            <YAxis domain={[0, 1]} tick={tickStyle} width={35} />
            <Line
              type="monotone"
              dataKey="flux"
              stroke="var(--amber)"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Core temperature */}
      <div style={graphContainerStyle}>
        <div style={labelStyle}>KERNTEMPERATUR (°C)</div>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={history}>
            <XAxis dataKey="tick" hide />
            <YAxis domain={['auto', 'auto']} tick={tickStyle} width={45} />
            <ReferenceLine y={1200} stroke="var(--alarm-red)" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="temp"
              stroke={coreTemperature > 1200 ? 'var(--alarm-red)' : 'var(--amber)'}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Steam pressure */}
      <div style={graphContainerStyle}>
        <div style={labelStyle}>DAMPFDRUCK (bar)</div>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={history}>
            <XAxis dataKey="tick" hide />
            <YAxis domain={['auto', 'auto']} tick={tickStyle} width={35} />
            <ReferenceLine y={80} stroke="var(--warning-yellow)" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="pressure"
              stroke="var(--warning-yellow)"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
