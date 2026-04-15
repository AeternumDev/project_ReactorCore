'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  CartesianGrid,
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

interface AxisSpec {
  domain: [number, number];
  ticks: number[];
}

interface AxisSpecOptions {
  fallbackValue: number;
  minimum?: number;
  minSpan: number;
  tickCount?: number;
}

const MAX_POINTS = 120;

const recorderTickStyle = {
  fontFamily: 'var(--font-share-tech-mono), monospace',
  fontSize: 9,
  fill: '#4a5a4a',
};

const recorderPanelStyle = {
  border: '1px solid var(--border)',
  padding: '8px',
  background: 'var(--surface)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const recorderShellStyle = {
  border: '1px solid #1e2a1e',
  background: '#0a0a0a',
  padding: '6px',
};

const recorderPaperStyle = {
  height: 118,
  border: '1px solid #1a2a1a',
  backgroundColor: '#080c08',
  backgroundImage: [
    'linear-gradient(to right, rgba(0, 255, 65, 0.06) 1px, transparent 1px)',
    'linear-gradient(to bottom, rgba(0, 255, 65, 0.06) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '18px 18px',
  boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)',
};

export function buildAxisSpec(
  values: number[],
  { fallbackValue, minimum, minSpan, tickCount = 5 }: AxisSpecOptions,
): AxisSpec {
  const sourceValues = values.length > 0 ? values : [fallbackValue];
  const minValue = Math.min(...sourceValues);
  const maxValue = Math.max(...sourceValues);
  const center = (minValue + maxValue) / 2;

  let domainMin = center - minSpan / 2;
  let domainMax = center + minSpan / 2;

  if (minimum !== undefined && domainMin < minimum) {
    domainMax += minimum - domainMin;
    domainMin = minimum;
  }

  const step = tickCount > 1 ? (domainMax - domainMin) / (tickCount - 1) : 0;
  const ticks = Array.from({ length: tickCount }, (_, index) => (
    index === tickCount - 1 ? domainMax : domainMin + step * index
  ));

  return {
    domain: [domainMin, domainMax],
    ticks,
  };
}

function formatAxisTick(value: number): string {
  return Math.abs(value) >= 100 ? Math.round(value).toString() : value.toFixed(1);
}

function formatFluxTick(value: number): string {
  return `${Math.round(value * 100)}`;
}

function buildTimeTicks(start: number, end: number, count = 5): number[] {
  if (count <= 1) return [end];

  const span = end - start;
  const step = span / (count - 1);

  return Array.from({ length: count }, (_, index) => (
    index === count - 1 ? end : Math.round(start + step * index)
  ));
}

function formatRecorderTime(value: number, lastTick: number): string {
  const secondsAgo = Math.max(0, Math.round((lastTick - value) * 0.5));
  return secondsAgo === 0 ? '0 s' : `-${secondsAgo} s`;
}

interface RecorderCardProps {
  channel: string;
  title: string;
  unit: string;
  dataKey: keyof Pick<DataPoint, 'flux' | 'temp' | 'pressure'>;
  history: DataPoint[];
  axis: AxisSpec;
  lastTick: number;
  valueText: string;
  lineColor: string;
  yTickFormatter?: (value: number) => string;
  yAxisWidth?: number;
  referenceLines?: Array<{
    value: number;
    color: string;
    dash?: string;
  }>;
}

function RecorderCard({
  channel,
  title,
  unit,
  dataKey,
  history,
  axis,
  lastTick,
  valueText,
  lineColor,
  yTickFormatter = formatAxisTick,
  yAxisWidth = 40,
  referenceLines = [],
}: RecorderCardProps) {
  const domainStart = Math.max(1, lastTick - MAX_POINTS + 1);
  const domainEnd = Math.max(MAX_POINTS, lastTick);
  const timeTicks = buildTimeTicks(domainStart, domainEnd);

  return (
    <div style={recorderShellStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '8px',
          marginBottom: '6px',
          fontFamily: 'var(--font-share-tech-mono), monospace',
        }}
      >
        <div style={{ color: 'var(--amber)', fontSize: '0.74rem', letterSpacing: '0.14em' }}>
          {channel} — {title}
        </div>
        <div style={{ color: lineColor, fontSize: '0.82rem', textShadow: `0 0 6px ${lineColor}` }}>{valueText}</div>
      </div>

      <div style={recorderPaperStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 8, right: 12, bottom: 12, left: 0 }}>
            <CartesianGrid stroke="#1a3a1a" strokeOpacity={0.8} vertical horizontal />
            <XAxis
              type="number"
              dataKey="tick"
              domain={[domainStart, domainEnd]}
              ticks={timeTicks}
              tickFormatter={(value) => formatRecorderTime(value, domainEnd)}
              tick={recorderTickStyle}
              tickLine={false}
              axisLine={{ stroke: '#1e3a1e' }}
              allowDecimals={false}
            />
            <YAxis
              domain={axis.domain}
              ticks={axis.ticks}
              tick={recorderTickStyle}
              tickFormatter={yTickFormatter}
              width={yAxisWidth}
              tickLine={false}
              axisLine={{ stroke: '#1e3a1e' }}
            />
            {referenceLines.map((line) => (
              <ReferenceLine
                key={`${title}-${line.value}`}
                y={line.value}
                stroke={line.color}
                strokeDasharray={line.dash ?? '4 3'}
              />
            ))}
            <Line
              type="linear"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              style={{ filter: `drop-shadow(0 0 3px ${lineColor})` }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '5px',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.62rem',
          color: '#4a5a4a',
          letterSpacing: '0.08em',
        }}
      >
        <span>PAPIERVORSCHUB: LETZTE 60 S</span>
        <span>{unit}</span>
      </div>
    </div>
  );
}

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

  const temperatureAxis = useMemo(
    () => buildAxisSpec(history.map((point) => point.temp), {
      fallbackValue: coreTemperature,
      minimum: 0,
      minSpan: 240,
    }),
    [history, coreTemperature],
  );

  const pressureAxis = useMemo(
    () => buildAxisSpec(history.map((point) => point.pressure), {
      fallbackValue: steamPressure,
      minimum: 0,
      minSpan: 24,
    }),
    [history, steamPressure],
  );

  const fluxAxis = useMemo<AxisSpec>(() => ({
    domain: [0, 1],
    ticks: [0, 0.25, 0.5, 0.75, 1],
  }), []);

  const lastTick = history[history.length - 1]?.tick ?? 0;

  return (
    <div style={recorderPanelStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '6px',
          fontFamily: 'var(--font-share-tech-mono), monospace',
        }}
      >
        <span style={{ color: 'var(--amber)', fontSize: '0.76rem', letterSpacing: '0.16em' }}>
          LINIENSCHREIBER — PARAMETERVERLAUF
        </span>
        <span style={{ color: '#555', fontSize: '0.66rem' }}>TG-8 AUSLAUFTEST</span>
      </div>

      <RecorderCard
        channel="KANAL I"
        title="NEUTRONENFLUSS"
        unit="REL. %"
        dataKey="flux"
        history={history}
        axis={fluxAxis}
        lastTick={lastTick}
        valueText={`${(neutronFlux * 100).toFixed(1)} %`}
        lineColor="#00ff41"
        yTickFormatter={formatFluxTick}
        yAxisWidth={34}
        referenceLines={[{ value: 0.8, color: '#ffd700' }]}
      />

      <RecorderCard
        channel="KANAL II"
        title="KERNTEMPERATUR"
        unit="°C"
        dataKey="temp"
        history={history}
        axis={temperatureAxis}
        lastTick={lastTick}
        valueText={`${coreTemperature.toFixed(0)} °C`}
        lineColor={coreTemperature > 1200 ? '#ff2020' : '#ff6633'}
        yAxisWidth={42}
        referenceLines={[{ value: 1200, color: '#ff2020' }]}
      />

      <RecorderCard
        channel="KANAL III"
        title="DAMPFDRUCK"
        unit="bar"
        dataKey="pressure"
        history={history}
        axis={pressureAxis}
        lastTick={lastTick}
        valueText={`${steamPressure.toFixed(1)} bar`}
        lineColor="#4488cc"
        yAxisWidth={36}
        referenceLines={[{ value: 80, color: '#ffd700' }]}
      />
    </div>
  );
}
