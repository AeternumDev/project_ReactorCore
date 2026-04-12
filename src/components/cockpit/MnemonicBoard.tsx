'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  CHANNELS, CORE_GRID, CORE_RADIUS, ROD_COLORS, ChannelInfo, RodType,
  getHeatColor, getNeutronColor, getCoreWarnings, Quadrant,
} from './coreLayout';
import { PHYSICS } from '@/lib/physics/constants';
import { GameAction } from '@/lib/physics/types';

interface MnemonicBoardProps {
  thermalPower: number;
  neutronFlux: number;
  isExploded: boolean;
  az5Active: boolean;
  az5Timer: number;
  controlRods: number;
  coreTemperatureZones: [number, number, number, number];
  manualRods: number;
  autoRods: number;
  shortenedRods: number;
  safetyRods: number;
  xenonConcentration: number;
  reactivityMargin: number;
  dispatch: React.Dispatch<GameAction>;
}

type ViewMode = 'heat' | 'neutron' | 'rods';

const CELL_PX = 6;
const GAP_PX = 1;
const CELL_TOTAL = CELL_PX + GAP_PX;
const TOTAL_PX = CORE_GRID * CELL_TOTAL;

function getChannelHeatColor(
  channel: ChannelInfo,
  coreTemperatureZones: [number, number, number, number],
  isExploded: boolean,
): string {
  if (isExploded) return '#331100';
  const qIdx = channel.quadrant === 'NW' ? 0 : channel.quadrant === 'NE' ? 1 :
    channel.quadrant === 'SW' ? 2 : 3;
  const baseTemp = coreTemperatureZones[qIdx];

  // Radial gradient: core center hotter, periphery cooler (cosine neutron flux profile)
  const center = CORE_GRID / 2;
  const dx = channel.col - center + 0.5;
  const dy = channel.row - center + 0.5;
  const r = Math.sqrt(dx * dx + dy * dy) / CORE_RADIUS;
  const radialFactor = 0.7 + 0.3 * Math.cos(Math.min(r, 1) * Math.PI / 2);

  // Rod channels are locally cooler (absorbing neutrons)
  const rodFactor = channel.channelType === 'rod' ? 0.85 : 1.0;

  // Deterministic micro-variation for visual texture
  const variation = 1.0 + 0.06 * Math.sin(channel.row * 3.7 + channel.col * 2.3);

  const adjustedTemp = baseTemp * radialFactor * rodFactor * variation;

  // Normalize against FUEL_TEMP_WARNING (1200°C) so operating temps (~270–650°C)
  // spread across the full color gradient. Temps above 1200°C clamp to red.
  const norm = Math.max(0, Math.min(1,
    (adjustedTemp - PHYSICS.COOLANT_TEMP_NOMINAL) / (PHYSICS.FUEL_TEMP_WARNING - PHYSICS.COOLANT_TEMP_NOMINAL)
  ));
  return getHeatColor(norm);
}

function getChannelNeutronColor(
  channel: ChannelInfo,
  neutronFlux: number,
  isExploded: boolean,
): string {
  if (isExploded) return '#111';
  // Spatial flux variation: center has higher flux (cosine profile)
  const center = CORE_GRID / 2;
  const dx = channel.col - center + 0.5;
  const dy = channel.row - center + 0.5;
  const r = Math.sqrt(dx * dx + dy * dy) / CORE_RADIUS;
  const spatialFactor = Math.cos(Math.min(r, 1) * Math.PI / 2);
  const localFlux = neutronFlux * (0.6 + 0.4 * spatialFactor);
  return getNeutronColor(localFlux);
}

function getChannelRodColor(
  channel: ChannelInfo,
  isExploded: boolean,
): string {
  if (isExploded) return '#222';
  if (channel.channelType === 'rod' && channel.rodType) {
    return ROD_COLORS[channel.rodType];
  }
  return '#2a3a2a';
}

export default function MnemonicBoard({
  thermalPower,
  neutronFlux,
  isExploded,
  az5Active,
  az5Timer,
  controlRods,
  coreTemperatureZones,
  manualRods,
  autoRods,
  shortenedRods,
  safetyRods,
  xenonConcentration,
  reactivityMargin,
  dispatch,
}: MnemonicBoardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('heat');
  const [hoveredChannel, setHoveredChannel] = useState<ChannelInfo | null>(null);

  const warnings = useMemo(
    () => getCoreWarnings(thermalPower, coreTemperatureZones, controlRods),
    [thermalPower, coreTemperatureZones, controlRods],
  );

  const handleCellClick = useCallback((channel: ChannelInfo) => {
    if (isExploded || !channel.rodType) return;

    // Click on a rod channel → adjust its group by 1 step
    switch (channel.rodType) {
      case 'RR':
        dispatch({ type: 'SET_MANUAL_RODS', payload: Math.max(0, manualRods - 1) });
        break;
      case 'AR':
        dispatch({ type: 'SET_AUTO_RODS', payload: Math.max(0, autoRods - 1) });
        break;
      case 'USP':
        dispatch({ type: 'SET_SHORTENED_RODS', payload: Math.max(0, shortenedRods - 1) });
        break;
      // AZ and LAR not directly controllable
    }
  }, [dispatch, manualRods, autoRods, shortenedRods, isExploded]);

  const handleCellRightClick = useCallback((e: React.MouseEvent, channel: ChannelInfo) => {
    e.preventDefault();
    if (isExploded || !channel.rodType) return;

    // Right-click → insert rod (increase)
    switch (channel.rodType) {
      case 'RR':
        dispatch({ type: 'SET_MANUAL_RODS', payload: Math.min(PHYSICS.MANUAL_RODS_MAX, manualRods + 1) });
        break;
      case 'AR':
        dispatch({ type: 'SET_AUTO_RODS', payload: Math.min(PHYSICS.AUTO_RODS_MAX, autoRods + 1) });
        break;
      case 'USP':
        dispatch({ type: 'SET_SHORTENED_RODS', payload: Math.min(PHYSICS.SHORTENED_RODS_MAX, shortenedRods + 1) });
        break;
    }
  }, [dispatch, manualRods, autoRods, shortenedRods, isExploded]);

  // Warning quadrant overlay
  const warningQuadrants = useMemo(() => {
    const result: Record<Quadrant, { color: string } | null> = { NW: null, NE: null, SW: null, SE: null };
    warnings.forEach(w => {
      const color = w.severity === 'alarm' ? 'rgba(255,32,32,0.15)' : 'rgba(255,200,0,0.10)';
      result[w.quadrant] = { color };
    });
    return result;
  }, [warnings]);

  const quadrantRects = useMemo(() => {
    const half = TOTAL_PX / 2;
    return {
      NW: { x: 0, y: 0, w: half, h: half },
      NE: { x: half, y: 0, w: half, h: half },
      SW: { x: 0, y: half, w: half, h: half },
      SE: { x: half, y: half, w: half, h: half },
    };
  }, []);

  return (
    <div style={{
      border: '1px solid var(--border)',
      padding: '6px',
      background: '#060b06',
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header with view mode toggle */}
      <div style={{
        fontFamily: 'var(--font-share-tech-mono), monospace',
        color: 'var(--amber)',
        fontSize: '0.75rem',
        marginBottom: '4px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '3px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>MNEMONISCHE TAFEL</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {(['heat', 'neutron', 'rods'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '1px 5px',
                background: viewMode === mode ? 'rgba(255,140,0,0.15)' : 'transparent',
                border: `1px solid ${viewMode === mode ? 'var(--amber)' : '#333'}`,
                color: viewMode === mode ? 'var(--amber)' : '#555',
                fontFamily: 'var(--font-share-tech-mono), monospace',
                fontSize: '0.6rem',
                cursor: 'pointer',
              }}
            >
              {mode === 'heat' ? 'TEMP' : mode === 'neutron' ? 'FLUX' : 'STÄBE'}
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredChannel && (
        <div style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.6rem',
          color: 'var(--amber)',
          marginBottom: '2px',
          height: '14px',
        }}>
          {hoveredChannel.id} — {hoveredChannel.channelType === 'rod'
            ? `${hoveredChannel.rodType} (Klick: ausfahren / Rechtsklick: einfahren)`
            : 'Brennstoffkanal'}
        </div>
      )}
      {!hoveredChannel && (
        <div style={{ height: '14px', marginBottom: '2px' }} />
      )}

      {/* SVG Core Map */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg
          viewBox={`0 0 ${TOTAL_PX} ${TOTAL_PX}`}
          style={{
            width: '100%',
            maxWidth: `${TOTAL_PX}px`,
            maxHeight: '340px',
          }}
        >
          {/* Warning quadrant overlays */}
          {(Object.entries(warningQuadrants) as [Quadrant, { color: string } | null][]).map(([q, w]) => {
            if (!w) return null;
            const r = quadrantRects[q];
            return (
              <rect key={`warn-${q}`} x={r.x} y={r.y} width={r.w} height={r.h}
                fill={w.color} />
            );
          })}

          {/* Channel cells */}
          {CHANNELS.map((ch, i) => {
            const x = ch.col * CELL_TOTAL;
            const y = ch.row * CELL_TOTAL;

            let fill: string;
            let opacity = 0.8;
            switch (viewMode) {
              case 'heat':
                fill = getChannelHeatColor(ch, coreTemperatureZones, isExploded);
                break;
              case 'neutron':
                fill = getChannelNeutronColor(ch, neutronFlux, isExploded);
                if (ch.channelType === 'rod') {
                  fill = ROD_COLORS[ch.rodType!];
                  opacity = 0.5;
                }
                break;
              case 'rods':
                fill = getChannelRodColor(ch, isExploded);
                opacity = ch.channelType === 'rod' ? 0.9 : 0.3;
                break;
            }

            const isRod = ch.channelType === 'rod';
            const isClickable = isRod && !isExploded &&
              ch.rodType !== 'AZ' && ch.rodType !== 'LAR';

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={CELL_PX}
                height={CELL_PX}
                fill={fill}
                opacity={opacity}
                stroke={hoveredChannel === ch ? '#fff' : isRod ? '#333' : 'none'}
                strokeWidth={hoveredChannel === ch ? 1 : 0.3}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
                onMouseEnter={() => setHoveredChannel(ch)}
                onMouseLeave={() => setHoveredChannel(null)}
                onClick={() => handleCellClick(ch)}
                onContextMenu={(e) => handleCellRightClick(e, ch)}
              />
            );
          })}

          {/* Quadrant dividers */}
          <line x1={TOTAL_PX / 2} y1={0} x2={TOTAL_PX / 2} y2={TOTAL_PX}
            stroke="#333" strokeWidth="0.5" />
          <line x1={0} y1={TOTAL_PX / 2} x2={TOTAL_PX} y2={TOTAL_PX / 2}
            stroke="#333" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginTop: '4px',
        fontFamily: 'var(--font-share-tech-mono), monospace',
        fontSize: '0.6rem',
      }}>
        <span style={{
          color: xenonConcentration > 0.6 ? 'var(--alarm-red)' :
            xenonConcentration > 0.3 ? 'var(--warning-yellow)' : 'var(--safe-green)',
        }}>
          Xe:{(xenonConcentration * 100).toFixed(0)}%
        </span>
        <span style={{
          color: reactivityMargin < PHYSICS.OZR_MINIMUM_SAFE ? 'var(--alarm-red)' :
            reactivityMargin < PHYSICS.OZR_WARNING ? 'var(--warning-yellow)' : 'var(--safe-green)',
        }}>
          OZR:{reactivityMargin}
        </span>
        <span style={{
          color: thermalPower >= PHYSICS.TEST_POWER_MIN && thermalPower <= PHYSICS.TEST_POWER_MAX
            ? 'var(--safe-green)' : 'var(--warning-yellow)',
        }}>
          {thermalPower.toFixed(0)}MW
        </span>
        {warnings.length > 0 && (
          <span style={{ color: 'var(--alarm-red)' }}>
            ⚠ {warnings.length}
          </span>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '3px',
        fontFamily: 'var(--font-share-tech-mono), monospace',
        fontSize: '0.55rem',
        color: '#666',
      }}>
        {viewMode === 'rods' && ([
          [ROD_COLORS.AZ, 'AZ'],
          [ROD_COLORS.AR, 'AR'],
          [ROD_COLORS.RR, 'RR'],
          [ROD_COLORS.LAR, 'LAR'],
          [ROD_COLORS.USP, 'USP'],
        ] as const).map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div style={{
              width: 5, height: 5,
              background: color,
              borderRadius: 1,
            }} />
            <span>{label}</span>
          </div>
        ))}
        {viewMode === 'heat' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
            <span style={{ flexShrink: 0 }}>{PHYSICS.COOLANT_TEMP_NOMINAL}°C</span>
            <div style={{
              flex: 1,
              height: 5,
              background: 'linear-gradient(to right, #0a3a20, #0a5a2e, #1a7a3e, #4a7a1a, #7a8a00, #aa8800, #cc7700, #cc4400, #dd2200, #ff1111)',
              borderRadius: 1,
            }} />
            <span style={{ flexShrink: 0 }}>{PHYSICS.FUEL_TEMP_WARNING}°C+</span>
          </div>
        )}
        {viewMode === 'neutron' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
            <span style={{ flexShrink: 0 }}>0%</span>
            <div style={{
              flex: 1,
              height: 5,
              background: 'linear-gradient(to right, #226644, #44aa88, #88cc44, #ffaa00)',
              borderRadius: 1,
            }} />
            <span style={{ flexShrink: 0 }}>100%</span>
          </div>
        )}
      </div>
    </div>
  );
}
