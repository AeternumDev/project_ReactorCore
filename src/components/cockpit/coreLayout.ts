// RBMK-1000 core layout data shared between SelsynPanel, MnemonicBoard, and ReactorCoreMap
import { PHYSICS } from '@/lib/physics/constants';

export type RodType = 'AZ' | 'AR' | 'RR' | 'LAR' | 'USP';
export type ChannelType = 'fuel' | 'rod' | 'sensor' | 'absorber' | 'empty';
export type Quadrant = 'NW' | 'NE' | 'SW' | 'SE';

interface Position {
  row: number;
  col: number;
}

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
  layoutColor?: string;
}

// Core grid config — image-derived RBMK-1000 lattice
// 1661 fuel channels + 211 control rods + 12 in-core detector channels.
export const CORE_GRID = 48;
const CENTER = CORE_GRID / 2;
const RADIUS = 23.5;
export const CORE_RADIUS = RADIUS;

const CORE_ROW_SPANS: Array<[number, number]> = [
  [17, 30],
  [14, 33],
  [12, 35],
  [10, 37],
  [9, 38],
  [8, 39],
  [7, 40],
  [6, 41],
  [5, 42],
  [4, 43],
  [3, 44],
  [3, 44],
  [2, 45],
  [2, 45],
  [1, 46],
  [1, 46],
  [1, 46],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [0, 47],
  [1, 46],
  [1, 46],
  [1, 46],
  [2, 45],
  [2, 45],
  [3, 44],
  [3, 44],
  [4, 43],
  [5, 42],
  [6, 41],
  [7, 40],
  [8, 39],
  [9, 38],
  [10, 37],
  [12, 35],
  [14, 33],
  [17, 30],
];

const REFERENCE_LAYOUT_COLORS = {
  cyan: '#00b150',
  yellow: '#fed800',
  red: '#de1700',
  blue: '#0067ce',
} as const;

const SENSOR_ROW_MAP: Record<number, number[]> = {
  7: [15, 31],
  15: [7, 23, 39],
  23: [15, 31],
  31: [7, 23, 39],
  39: [15, 31],
};

const RED_ROW_MAP: Record<number, number[]> = {
  11: [23],
  15: [15, 31],
  19: [23],
  23: [11, 19, 27, 35],
  27: [23],
  31: [15, 31],
  35: [23],
};

const YELLOW_ROW_MAP: Record<number, number[]> = {
  3: [11, 19, 27, 35],
  11: [3, 11, 19, 27, 35, 43],
  19: [3, 11, 19, 27, 35, 43],
  27: [3, 11, 19, 27, 35, 43],
  35: [3, 11, 19, 27, 35, 43],
  43: [11, 19, 27, 35],
};

const CYAN_ROW_MAP: Record<number, number[]> = {
  1: [17, 21, 25, 29],
  3: [15, 23, 31],
  5: [9, 13, 17, 21, 25, 29, 33, 37],
  7: [7, 11, 19, 23, 27, 35, 39],
  9: [5, 9, 13, 17, 21, 25, 29, 33, 37, 41],
  11: [7, 15, 31, 39],
  13: [5, 9, 13, 17, 21, 25, 29, 33, 37, 41],
  15: [3, 11, 19, 27, 35, 43],
  17: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45],
  19: [7, 15, 31, 39],
  21: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45],
  23: [3, 7, 23, 39, 43],
  25: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45],
  27: [7, 15, 31, 39],
  29: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45],
  31: [3, 11, 19, 27, 35, 43],
  33: [5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45],
  35: [7, 15, 31, 39],
  37: [5, 9, 13, 17, 21, 25, 29, 33, 37, 41],
  39: [7, 11, 19, 23, 27, 35, 39],
  41: [9, 13, 17, 21, 25, 29, 33, 37],
  43: [15, 23, 31],
  45: [17, 21, 25, 29, 33],
};

const AZ_ROW_MAP: Record<number, number[]> = {
  1: [21, 29],
  5: [13, 37],
  9: [5, 25],
  11: [31, 39],
  13: [17],
  17: [33, 45],
  19: [7],
  23: [23],
  25: [41],
  29: [1, 13, 33],
  33: [21, 45],
  37: [5, 37],
  41: [13],
  43: [31],
  45: [21],
};

function expandRowMap(rowMap: Record<number, number[]>): Position[] {
  const positions: Position[] = [];

  Object.entries(rowMap).forEach(([rowText, cols]) => {
    const row = Number(rowText);
    cols.forEach(col => positions.push({ row, col }));
  });

  return positions;
}

function comparePositions(a: Position, b: Position): number {
  return a.row - b.row || a.col - b.col;
}

function toPositionKey(row: number, col: number): string {
  return `${row}:${col}`;
}

const SENSOR_POSITIONS = expandRowMap(SENSOR_ROW_MAP);
const RED_LAYOUT_POSITIONS = expandRowMap(RED_ROW_MAP);
const YELLOW_LAYOUT_POSITIONS = expandRowMap(YELLOW_ROW_MAP);
const CYAN_LAYOUT_POSITIONS = expandRowMap(CYAN_ROW_MAP);
const AZ_POSITIONS = expandRowMap(AZ_ROW_MAP);

const SENSOR_POSITION_SET = new Set(SENSOR_POSITIONS.map(({ row, col }) => toPositionKey(row, col)));
const RED_LAYOUT_SET = new Set(RED_LAYOUT_POSITIONS.map(({ row, col }) => toPositionKey(row, col)));
const YELLOW_LAYOUT_SET = new Set(YELLOW_LAYOUT_POSITIONS.map(({ row, col }) => toPositionKey(row, col)));
const CYAN_LAYOUT_SET = new Set(CYAN_LAYOUT_POSITIONS.map(({ row, col }) => toPositionKey(row, col)));
const AZ_POSITION_SET = new Set(AZ_POSITIONS.map(({ row, col }) => toPositionKey(row, col)));

function getLayoutColor(row: number, col: number): string | undefined {
  const key = toPositionKey(row, col);

  if (SENSOR_POSITION_SET.has(key)) return REFERENCE_LAYOUT_COLORS.blue;
  if (RED_LAYOUT_SET.has(key)) return REFERENCE_LAYOUT_COLORS.red;
  if (YELLOW_LAYOUT_SET.has(key)) return REFERENCE_LAYOUT_COLORS.yellow;
  if (CYAN_LAYOUT_SET.has(key)) return REFERENCE_LAYOUT_COLORS.cyan;

  return undefined;
}

export function isInsideCore(row: number, col: number): boolean {
  if (row < 0 || row >= CORE_ROW_SPANS.length) return false;

  const [startCol, endCol] = CORE_ROW_SPANS[row];
  return col >= startCol && col <= endCol;
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

export function generateRods(): RodInfo[] {
  const rods: RodInfo[] = [];
  const groupCounters: Record<RodType, number> = { AZ: 0, AR: 0, RR: 0, LAR: 0, USP: 0 };

  const rodPositions = [
    ...CYAN_LAYOUT_POSITIONS,
    ...RED_LAYOUT_POSITIONS,
    ...YELLOW_LAYOUT_POSITIONS,
  ].sort(comparePositions);

  rodPositions.forEach(pos => {
    const key = toPositionKey(pos.row, pos.col);
    let type: RodType;

    if (RED_LAYOUT_SET.has(key)) {
      type = 'AR';
    } else if (YELLOW_LAYOUT_SET.has(key)) {
      type = 'USP';
    } else if (AZ_POSITION_SET.has(key)) {
      type = 'AZ';
    } else {
      type = 'RR';
    }

    groupCounters[type]++;
    rods.push({
      row: pos.row,
      col: pos.col,
      type,
      id: `${String(pos.col + 1).padStart(2, '0')}-${String(pos.row + 1).padStart(2, '0')}`,
      quadrant: getQuadrant(pos.row, pos.col),
      group: groupCounters[type] - 1,
    });
  });

  return rods;
}

// Generate all channels for the mnemonic board.
export function generateChannels(): ChannelInfo[] {
  const channels: ChannelInfo[] = [];
  const rods = generateRods();
  const rodMap = new Map<string, RodInfo>();
  rods.forEach(r => rodMap.set(toPositionKey(r.row, r.col), r));

  for (let row = 0; row < CORE_GRID; row++) {
    const [startCol, endCol] = CORE_ROW_SPANS[row];

    for (let col = startCol; col <= endCol; col++) {
      const key = toPositionKey(row, col);
      const rod = rodMap.get(key);
      const id = `${String(col + 1).padStart(2, '0')}-${String(row + 1).padStart(2, '0')}`;
      const quadrant = getQuadrant(row, col);

      if (SENSOR_POSITION_SET.has(key)) {
        channels.push({
          row,
          col,
          channelType: 'sensor',
          id,
          quadrant,
          layoutColor: REFERENCE_LAYOUT_COLORS.blue,
        });
      } else if (rod) {
        channels.push({
          row,
          col,
          channelType: 'rod',
          rodType: rod.type,
          id,
          quadrant,
          layoutColor: getLayoutColor(row, col),
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
