'use client';

import { useMemo } from 'react';
import { PHYSICS } from '@/lib/physics/constants';

interface ReactorCoreMapProps {
  coreTemperatureZones: [number, number, number, number];
  controlRods: number;
  manualRods: number;
  autoRods: number;
  shortenedRods: number;
  safetyRods: number;
  thermalPower: number;
  neutronFlux: number;
}

// RBMK-1000 Kernquerschnitt: kreisförmiges Gitter
const GRID_SIZE = 18;
const CENTER = GRID_SIZE / 2;
const RADIUS = 8;
const CELL_SIZE = 20;
const GAP = 1;

interface CoreCell {
  row: number;
  col: number;
  type: 'fuel' | 'mr' | 'ar' | 'usp' | 'az';
  zone: number; // 0-3 für Temperaturzone
}

function generateCoreCells(): CoreCell[] {
  const cells: CoreCell[] = [];
  let mrCount = 0;
  let arCount = 0;
  let uspCount = 0;
  let azCount = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const dx = col - CENTER + 0.5;
      const dy = row - CENTER + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > RADIUS) continue;

      // Bestimme Temperaturzone basierend auf Position (Quadrant)
      const zone = (dy < 0 ? 0 : 2) + (dx < 0 ? 0 : 1);

      // Stabtyp-Verteilung: regelmäßig über den Kern verteilt
      let type: CoreCell['type'] = 'fuel';

      // Muster: jeden 3. Kanal in regelmäßigem Muster als Stab
      const idx = row * GRID_SIZE + col;
      if (idx % 13 === 0 && mrCount < 30) {
        type = 'mr';
        mrCount++;
      } else if (idx % 17 === 0 && arCount < 12) {
        type = 'ar';
        arCount++;
      } else if (idx % 11 === 0 && uspCount < 24) {
        type = 'usp';
        uspCount++;
      } else if (idx % 7 === 3 && azCount < 20 && dist > 2) {
        type = 'az';
        azCount++;
      }

      cells.push({ row, col, type, zone });
    }
  }

  return cells;
}

function tempToColor(temp: number): string {
  const ratio = Math.max(0, Math.min(1,
    (temp - PHYSICS.COOLANT_TEMP_NOMINAL) / (PHYSICS.FUEL_TEMP_MELTDOWN - PHYSICS.COOLANT_TEMP_NOMINAL)
  ));

  if (ratio < 0.2) return '#0a4a2e';     // kalt — dunkelgrün
  if (ratio < 0.35) return '#1a7a3e';    // normal — grün
  if (ratio < 0.5) return '#8a8a00';     // warm — gelb-grün
  if (ratio < 0.65) return '#cc8800';    // heiß — orange
  if (ratio < 0.8) return '#cc3300';     // sehr heiß — rot-orange
  return '#ff1111';                       // kritisch — rot
}

function getRodColor(type: CoreCell['type']): string {
  switch (type) {
    case 'mr': return '#00aaff';
    case 'ar': return '#ffaa00';
    case 'usp': return '#ff44ff';
    case 'az': return '#ff2222';
    default: return '';
  }
}

const CORE_CELLS = generateCoreCells();

export default function ReactorCoreMap({
  coreTemperatureZones,
  controlRods,
  manualRods,
  autoRods,
  shortenedRods,
  safetyRods,
  thermalPower,
  neutronFlux,
}: ReactorCoreMapProps) {
  const cellSize = CELL_SIZE;
  const gap = GAP;
  const totalSize = GRID_SIZE * (cellSize + gap);

  // Stabeinführungsgrad: 0=ausgefahren, 1=vollständig eingefahren
  const mrFraction = manualRods / PHYSICS.MANUAL_RODS_MAX;
  const arFraction = autoRods / PHYSICS.AUTO_RODS_MAX;
  const uspFraction = shortenedRods / PHYSICS.SHORTENED_RODS_MAX;
  const azFraction = safetyRods / PHYSICS.SAFETY_RODS_MAX;

  const powerLevel = thermalPower / PHYSICS.MAX_THERMAL_POWER;

  // Pseudo-zufällige Temperaturvariation pro Zelle (deterministisch)
  const renderedCells = useMemo(() => {
    return CORE_CELLS.map((cell, i) => {
      const baseTemp = coreTemperatureZones[cell.zone];
      // Lokale Variation basierend auf Position und Leistung
      const localVariation = Math.sin(i * 0.7) * 30 * powerLevel +
        Math.cos(i * 1.3) * 20 * neutronFlux;
      const temp = baseTemp + localVariation;

      return { ...cell, temp };
    });
  }, [coreTemperatureZones, powerLevel, neutronFlux]);

  const isWarning = controlRods < PHYSICS.MINIMUM_SAFE_RODS;

  return (
    <div
      style={{
        border: `1px solid ${isWarning ? 'var(--alarm-red)' : 'var(--border)'}`,
        padding: '8px',
        background: 'var(--surface)',
      }}
      className={isWarning ? 'animate-border-flash' : ''}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.75rem',
          marginBottom: '6px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>KERNQUERSCHNITT — BRENNELEMENTANZEIGE</span>
        <span style={{ color: '#666' }}>{CORE_CELLS.length} KANÄLE</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        {/* Kern-Gitter */}
        <svg
          viewBox={`0 0 ${totalSize} ${totalSize}`}
          style={{ flexShrink: 0, width: '100%', maxWidth: `${totalSize}px` }}
        >
          {/* Hintergrund-Kreis */}
          <circle
            cx={totalSize / 2}
            cy={totalSize / 2}
            r={RADIUS * (cellSize + gap)}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1"
          />

          {renderedCells.map((cell, i) => {
            const x = cell.col * (cellSize + gap);
            const y = cell.row * (cellSize + gap);
            const bgColor = tempToColor(cell.temp);
            const rodColor = getRodColor(cell.type);
            const isRod = cell.type !== 'fuel';

            // Bestimme ob dieser Stab eingefahren ist
            let rodInserted = false;
            if (cell.type === 'mr') rodInserted = mrFraction > 0.3;
            else if (cell.type === 'ar') rodInserted = arFraction > 0.3;
            else if (cell.type === 'usp') rodInserted = uspFraction > 0.3;
            else if (cell.type === 'az') rodInserted = azFraction > 0.3;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={bgColor}
                  stroke={isRod ? rodColor : '#1a1a1a'}
                  strokeWidth={isRod ? 1.5 : 0.5}
                  opacity={isRod && rodInserted ? 0.5 : 1}
                />
                {/* Stabindikator bei eingefahrenem Stab */}
                {isRod && rodInserted && (
                  <circle
                    cx={x + cellSize / 2}
                    cy={y + cellSize / 2}
                    r={3}
                    fill={rodColor}
                  />
                )}
                {/* Stabmarkierung bei ausgefahrenem Stab */}
                {isRod && !rodInserted && (
                  <rect
                    x={x + 2}
                    y={y + 2}
                    width={cellSize - 4}
                    height={cellSize - 4}
                    fill="none"
                    stroke={rodColor}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Legende */}
        <div
          style={{
            fontFamily: 'var(--font-share-tech-mono), monospace',
            fontSize: '0.55rem',
            color: '#888',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '80px',
          }}
        >
          <div style={{ color: 'var(--amber)', fontSize: '0.6rem', marginBottom: '2px' }}>STABTYPEN</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, background: '#0a4a2e', border: '1px solid #1a1a1a' }} />
            <span>BRENNSTOFF</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, background: '#111', border: '1px solid #00aaff' }} />
            <span>MR ({manualRods.toFixed(0)}/{PHYSICS.MANUAL_RODS_MAX})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, background: '#111', border: '1px solid #ffaa00' }} />
            <span>AR ({autoRods.toFixed(0)}/{PHYSICS.AUTO_RODS_MAX})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, background: '#111', border: '1px solid #ff44ff' }} />
            <span>USP ({shortenedRods.toFixed(0)}/{PHYSICS.SHORTENED_RODS_MAX})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, background: '#111', border: '1px solid #ff2222' }} />
            <span>AZ ({safetyRods.toFixed(0)}/{PHYSICS.SAFETY_RODS_MAX})</span>
          </div>

          <div style={{ color: 'var(--amber)', fontSize: '0.6rem', marginTop: '6px', marginBottom: '2px' }}>TEMPERATUR</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {[
              { color: '#0a4a2e', label: '<400°C' },
              { color: '#1a7a3e', label: '400-700°C' },
              { color: '#8a8a00', label: '700-1200°C' },
              { color: '#cc8800', label: '1200-1800°C' },
              { color: '#cc3300', label: '1800-2400°C' },
              { color: '#ff1111', label: '>2400°C' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 8, height: 8, background: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '6px', color: 'var(--amber)', fontSize: '0.6rem' }}>
            OZR: {controlRods}
            <span style={{
              color: controlRods < PHYSICS.MINIMUM_SAFE_RODS ? 'var(--alarm-red)' :
                controlRods < 30 ? 'var(--warning-yellow)' : 'var(--safe-green)',
              marginLeft: '4px',
            }}>
              {controlRods < PHYSICS.MINIMUM_SAFE_RODS ? '⚠ KRITISCH' :
                controlRods < 30 ? '⚠ NIEDRIG' : '● NORMAL'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
