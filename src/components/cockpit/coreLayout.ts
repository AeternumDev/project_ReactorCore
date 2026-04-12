// RBMK-1000 core layout data shared between SelsynPanel, MnemonicBoard, and ReactorCoreMap
import { PHYSICS } from '@/lib/physics/constants';

export type RodType = 'AZ' | 'AR' | 'RR' | 'LAR' | 'USP';
export type ChannelType = 'fuel' | 'rod' | 'absorber' | 'empty';
export type Quadrant = 'NW' | 'NE' | 'SW' | 'SE';

export interface RodInfo {
  row: number;
  col: number;
  type: RodType;
  id: string;
  quadrant: Quadrant;
  group: number; // group index within type
}

export interface ChannelInfo {
  row: number;
  col: number;
  channelType: ChannelType;
  rodType?: RodType;
  id: string;
  quadrant: Quadrant;
}

// Core grid config — RBMK-1000: ~1661 fuel + 211 CPS channels on 25cm lattice
export const CORE_GRID = 50;
const CENTER = CORE_GRID / 2;
const RADIUS = 23;
export const CORE_RADIUS = RADIUS;

export function isInsideCore(row: number, col: number): boolean {
  const dx = col - CENTER + 0.5;
  const dy = row - CENTER + 0.5;
  return Math.sqrt(dx * dx + dy * dy) <= RADIUS;
}

export function getQuadrant(row: number, col: number): Quadrant {
  const isNorth = row < CENTER;
  const isWest = col < CENTER;
  if (isNorth && isWest) return 'NW';
  if (isNorth) return 'NE';
  if (isWest) return 'SW';
  return 'SE';
}

// Rod type colors for all panels
export const ROD_COLORS: Record<RodType, string> = {
  AZ: '#ff3333',
  AR: '#66ff66',
  RR: '#cccccc',
  LAR: '#4488ff',
  USP: '#ffcc00',
};

export const ROD_TYPE_LABELS: Record<RodType, string> = {
  AZ: 'AZ — Notschutz',
  AR: 'AR — Autom. Regelung',
  RR: 'RR — Handregelung',
  LAR: 'LAR — Lok. Automatik',
  USP: 'USP — Kurzabsorber',
};

// Rod depth on 0–7 m scale (shared computation)
export function getRodDepthMeters(
  type: RodType,
  manualRods: number,
  autoRods: number,
  shortenedRods: number,
  safetyRods: number,
  az5Active: boolean,
  az5Timer: number,
  isExploded: boolean,
): number {
  if (isExploded) return 3.5; // jammed mid-core

  let fraction: number;
  switch (type) {
    case 'AZ':
      fraction = safetyRods / PHYSICS.SAFETY_RODS_MAX;
      if (az5Active && az5Timer > 0) fraction = Math.min(fraction, 0.25);
      break;
    case 'AR':
      fraction = autoRods / PHYSICS.AUTO_RODS_MAX;
      break;
    case 'RR':
      fraction = manualRods / PHYSICS.MANUAL_RODS_MAX;
      break;
    case 'LAR':
      fraction = autoRods / PHYSICS.AUTO_RODS_MAX;
      break;
    case 'USP':
      fraction = shortenedRods / PHYSICS.SHORTENED_RODS_MAX;
      break;
  }

  fraction = Math.max(0, Math.min(1, fraction));
  return fraction * 7;
}

// Alarm state for a rod group
export type RodAlarmState = 'normal' | 'warning' | 'alarm';

export function getRodAlarmState(depth: number, type: RodType): RodAlarmState {
  if (type === 'AZ') {
    if (depth < 1.0) return 'alarm';   // AZ nearly fully withdrawn
    if (depth < 2.0) return 'warning';
    return 'normal';
  }
  // General: deep insertion past 6m or very shallow < 0.5m
  if (depth > 6.5) return 'warning';
  if (depth < 0.3) return 'warning';
  return 'normal';
}

// Quadrant balance: returns max deviation from average
export function getQuadrantBalance(
  rods: RodInfo[],
  getDepth: (rod: RodInfo) => number,
): { avg: number; quadrants: Record<Quadrant, number>; maxDeviation: number } {
  const qs: Record<Quadrant, number[]> = { NW: [], NE: [], SW: [], SE: [] };
  rods.forEach(r => qs[r.quadrant].push(getDepth(r)));

  const allDepths = rods.map(getDepth);
  const avg = allDepths.length > 0 ? allDepths.reduce((a, b) => a + b, 0) / allDepths.length : 0;

  const quadrants: Record<Quadrant, number> = {
    NW: qs.NW.length > 0 ? qs.NW.reduce((a, b) => a + b, 0) / qs.NW.length : 0,
    NE: qs.NE.length > 0 ? qs.NE.reduce((a, b) => a + b, 0) / qs.NE.length : 0,
    SW: qs.SW.length > 0 ? qs.SW.reduce((a, b) => a + b, 0) / qs.SW.length : 0,
    SE: qs.SE.length > 0 ? qs.SE.reduce((a, b) => a + b, 0) / qs.SE.length : 0,
  };

  const maxDeviation = Math.max(
    ...Object.values(quadrants).map(q => Math.abs(q - avg))
  );

  return { avg, quadrants, maxDeviation };
}

// Heat zone color for mnemonic board (10-step gradient for smooth thermal display)
export function getHeatColor(normalizedPower: number): string {
  if (normalizedPower > 0.92) return '#ff1111';
  if (normalizedPower > 0.82) return '#dd2200';
  if (normalizedPower > 0.72) return '#cc4400';
  if (normalizedPower > 0.62) return '#cc7700';
  if (normalizedPower > 0.52) return '#aa8800';
  if (normalizedPower > 0.42) return '#7a8a00';
  if (normalizedPower > 0.32) return '#4a7a1a';
  if (normalizedPower > 0.22) return '#1a7a3e';
  if (normalizedPower > 0.12) return '#0a5a2e';
  return '#0a3a20';
}

// Neutron activity color
export function getNeutronColor(flux: number): string {
  if (flux > 0.8) return '#ffaa00';
  if (flux > 0.5) return '#88cc44';
  if (flux > 0.2) return '#44aa88';
  return '#226644';
}

// Warning region detection
export interface CoreWarning {
  quadrant: Quadrant;
  type: 'heat' | 'neutron' | 'rod_withdrawal';
  severity: 'warning' | 'alarm';
}

export function getCoreWarnings(
  thermalPower: number,
  coreTemperatureZones: [number, number, number, number],
  controlRods: number,
): CoreWarning[] {
  const warnings: CoreWarning[] = [];
  const quadrants: Quadrant[] = ['NW', 'NE', 'SW', 'SE'];

  quadrants.forEach((q, i) => {
    if (coreTemperatureZones[i] > PHYSICS.FUEL_TEMP_WARNING) {
      warnings.push({
        quadrant: q,
        type: 'heat',
        severity: coreTemperatureZones[i] > PHYSICS.FUEL_TEMP_MELTDOWN * 0.8 ? 'alarm' : 'warning',
      });
    }
  });

  if (controlRods < PHYSICS.MINIMUM_SAFE_RODS) {
    warnings.push({ quadrant: 'NW', type: 'rod_withdrawal', severity: 'alarm' });
  } else if (controlRods < PHYSICS.OZR_WARNING) {
    warnings.push({ quadrant: 'NW', type: 'rod_withdrawal', severity: 'warning' });
  }

  return warnings;
}

// Generate 211 CPS rods on a regular sublattice — RBMK-1000 CPS pattern
//
// Historical layout principle:
//   All CPS channels sit on a regular sublattice (every 3rd position).
//   AZ  (24)  — dedicated positions on a sparser 6×6 sub-grid, evenly distributed
//   AR  (12)  — innermost ring, central automatic power regulators
//   USP (32)  — interleaved among RR in inner/mid zone (every 2nd–3rd rod position)
//   LAR (12)  — interleaved among RR in mid zone (every 4th–5th rod position)
//   RR  (131) — remaining positions (manual control rods)
//
// The interleaving creates the pattern the user expects:
//   Inner: RR, USP, RR, LAR, RR, USP, ...
//   Outer: RR, RR, RR, USP, RR, RR, LAR, ...
export function generateRods(): RodInfo[] {
  const rods: RodInfo[] = [];

  // Phase 1: Collect all CPS sublattice positions (every 3rd cell)
  const cpsPositions: Array<{ row: number; col: number; r: number }> = [];
  for (let row = 0; row < CORE_GRID; row++) {
    for (let col = 0; col < CORE_GRID; col++) {
      if (!isInsideCore(row, col)) continue;
      // Regular 3×3 sublattice with offset rows for better coverage
      const onGrid = (row % 3 === 1 && col % 3 === 1) ||
                     (row % 6 === 4 && col % 6 === 4);
      if (onGrid) {
        const dx = col - CENTER + 0.5;
        const dy = row - CENTER + 0.5;
        cpsPositions.push({ row, col, r: Math.sqrt(dx * dx + dy * dy) });
      }
    }
  }

  // Sort by radius for zone-based assignment
  cpsPositions.sort((a, b) => a.r - b.r);
  const selected = cpsPositions.slice(0, Math.min(211, cpsPositions.length));

  // Phase 2: Mark AZ positions first — on a sparser sub-grid for even distribution
  // AZ rods sit every ~9th CPS position, spread from inner to outer
  const azStride = Math.max(1, Math.floor(selected.length / 24));
  const azSet = new Set<number>();
  // Start from offset 2 so AZ don't overlap with AR in center
  for (let i = 0; i < 24; i++) {
    const idx = Math.min(2 + i * azStride, selected.length - 1);
    if (!azSet.has(idx)) azSet.add(idx);
  }

  // Phase 3: From non-AZ positions, assign AR/USP/LAR/RR with interleaving
  const nonAzIndices: number[] = [];
  for (let i = 0; i < selected.length; i++) {
    if (!azSet.has(i)) nonAzIndices.push(i);
  }

  // AR: 12 innermost non-AZ positions
  const arCount = 12;

  // For remaining positions after AR: interleave USP and LAR among RR
  // based on radial zone
  const maxR = selected.length > 0 ? selected[selected.length - 1].r : 1;
  const counts: Record<RodType, number> = { AZ: 0, AR: 0, RR: 0, LAR: 0, USP: 0 };
  const assignments = new Map<number, RodType>();

  // Assign AZ
  azSet.forEach(idx => { assignments.set(idx, 'AZ'); counts.AZ++; });

  // Assign non-AZ
  let uspPlaced = 0, larPlaced = 0;
  let interleaveCounter = 0;

  nonAzIndices.forEach((idx, seqIdx) => {
    if (seqIdx < arCount) {
      // AR: innermost 12
      assignments.set(idx, 'AR');
      counts.AR++;
      return;
    }

    const pos = selected[idx];
    const rNorm = pos.r / maxR; // 0 = center, 1 = edge

    // Interleaving density depends on zone:
    //   Inner (r < 0.4): every 2nd position is USP or LAR → pattern: RR, USP, RR, LAR, ...
    //   Mid   (r < 0.7): every 3rd position → RR, RR, USP, RR, RR, LAR, ...
    //   Outer (r >= 0.7): every 4th position → RR, RR, RR, USP/LAR, ...
    const interleaveInterval = rNorm < 0.4 ? 2 : rNorm < 0.7 ? 3 : 4;

    interleaveCounter++;
    if (interleaveCounter % interleaveInterval === 0) {
      // Alternate between USP and LAR, respecting quotas
      if (uspPlaced < 32 && (larPlaced >= 12 || interleaveCounter % (interleaveInterval * 2) !== 0)) {
        assignments.set(idx, 'USP');
        counts.USP++;
        uspPlaced++;
      } else if (larPlaced < 12) {
        assignments.set(idx, 'LAR');
        counts.LAR++;
        larPlaced++;
      } else if (uspPlaced < 32) {
        assignments.set(idx, 'USP');
        counts.USP++;
        uspPlaced++;
      } else {
        assignments.set(idx, 'RR');
        counts.RR++;
      }
    } else {
      assignments.set(idx, 'RR');
      counts.RR++;
    }
  });

  // Phase 4: Build rod array
  const groupCounters: Record<RodType, number> = { AZ: 0, AR: 0, RR: 0, LAR: 0, USP: 0 };
  selected.forEach((pos, idx) => {
    const type = assignments.get(idx) ?? 'RR';
    groupCounters[type]++;
    rods.push({
      row: pos.row, col: pos.col, type,
      id: `${String(pos.col + 1).padStart(2, '0')}-${String(pos.row + 1).padStart(2, '0')}`,
      quadrant: getQuadrant(pos.row, pos.col),
      group: groupCounters[type] - 1,
    });
  });

  return rods;
}

// Generate all channels for the mnemonic board (~1660 channels in RBMK-1000 layout)
export function generateChannels(): ChannelInfo[] {
  const channels: ChannelInfo[] = [];
  const rods = generateRods();
  const rodMap = new Map<string, RodInfo>();
  rods.forEach(r => rodMap.set(`${r.row}-${r.col}`, r));

  for (let row = 0; row < CORE_GRID; row++) {
    for (let col = 0; col < CORE_GRID; col++) {
      if (!isInsideCore(row, col)) continue;

      const key = `${row}-${col}`;
      const rod = rodMap.get(key);
      const id = `${String(col + 1).padStart(2, '0')}-${String(row + 1).padStart(2, '0')}`;
      const quadrant = getQuadrant(row, col);

      if (rod) {
        channels.push({
          row,
          col,
          channelType: 'rod',
          rodType: rod.type,
          id,
          quadrant,
        });
      } else {
        channels.push({
          row,
          col,
          channelType: 'fuel',
          id,
          quadrant,
        });
      }
    }
  }

  return channels;
}

// Precompute
export const RODS = generateRods();
export const CHANNELS = generateChannels();
