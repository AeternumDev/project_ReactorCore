'use client';

import { PHYSICS } from '@/lib/physics/constants';

interface SynopticDiagramProps {
  thermalPower: number;
  coolantTemperature: number;
  coolantFlowRate: number;
  steamPressure: number;
  steamVoidFraction: number;
  drumSeparatorLevel: number;
  feedWaterFlow: number;
  turbineConnected: boolean;
  turbineSpeed: number;
  turbineValveOpen: number;
  eccsEnabled: boolean;
  activeCoolantPumps: number;
  pumpStates: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  fuelTemperature: number;
  generatorOutput: number;
  reactivityMargin: number;
  xenonConcentration: number;
  bazArmed: boolean;
  az5Active: boolean;
}

function flowColor(temp: number): string {
  const ratio = (temp - PHYSICS.COOLANT_TEMP_NOMINAL) /
    (PHYSICS.COOLANT_TEMP_BOILING - PHYSICS.COOLANT_TEMP_NOMINAL + 30);
  if (ratio < 0.3) return '#2288cc';
  if (ratio < 0.6) return '#44aa44';
  if (ratio < 0.8) return '#ccaa00';
  return '#cc4400';
}

function pipeWidth(flowRate: number): number {
  return Math.max(2, Math.min(5, (flowRate / PHYSICS.COOLANT_FLOW_NOMINAL) * 3.5));
}

/* ─── Chernobyl-style rectangular warning tile — packed tight like the мнемосхема ─── */
function WarningTile({ x, y, w, h, label, active, color, blink }: {
  x: number; y: number; w: number; h: number; label: string;
  active: boolean; color: string; blink?: boolean;
}) {
  return (
    <g>
      {active && blink && (
        <animate attributeName="opacity" values="1;0.22;1" dur="0.48s" repeatCount="indefinite" />
      )}
      {/* Outer frame */}
      <rect x={x} y={y} width={w} height={h}
        fill={active ? `${color}1a` : '#050505'}
        stroke={active ? `${color}66` : '#171717'}
        strokeWidth="0.5" />
      {/* Subtle inner highlight when active */}
      {active && (
        <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2}
          fill={color} opacity="0.07" />
      )}
      {/* Label text */}
      <text x={x + w / 2} y={y + h / 2 + 2}
        textAnchor="middle"
        fill={active ? color : '#1e1e1e'}
        fontSize="6.5" fontFamily="monospace"
        fontWeight={active ? 'bold' : 'normal'}
        letterSpacing="0.15">
        {label}
      </text>
    </g>
  );
}

export default function SynopticDiagram({
  thermalPower,
  coolantTemperature,
  coolantFlowRate,
  steamPressure,
  steamVoidFraction,
  drumSeparatorLevel,
  feedWaterFlow,
  turbineConnected,
  turbineSpeed,
  turbineValveOpen,
  eccsEnabled,
  activeCoolantPumps,
  pumpStates,
  fuelTemperature,
  generatorOutput,
  reactivityMargin,
  xenonConcentration,
  bazArmed,
  az5Active,
}: SynopticDiagramProps) {
  const powerFraction = thermalPower / PHYSICS.MAX_THERMAL_POWER;
  const pColor = flowColor(coolantTemperature);
  const pw = pipeWidth(coolantFlowRate);

  const steamColor = steamVoidFraction > 0.3 ? '#cc4400' :
    steamVoidFraction > 0.1 ? '#ccaa00' : '#888';

  // ── Warning states ──────────────────────────────────────────
  const warnOverpower   = thermalPower > PHYSICS.TEST_POWER_MAX;
  const critOverpower   = thermalPower > PHYSICS.MAX_THERMAL_POWER * 0.8;
  const warnCoolantTemp = coolantTemperature > PHYSICS.COOLANT_TEMP_BOILING - 4;
  const critCoolantTemp = coolantTemperature > PHYSICS.COOLANT_TEMP_BOILING;
  const warnFuelTemp    = fuelTemperature > PHYSICS.FUEL_TEMP_WARNING;
  const critFuelTemp    = fuelTemperature > PHYSICS.FUEL_TEMP_MELTDOWN * 0.7;
  const warnPressure    = steamPressure > PHYSICS.STEAM_PRESSURE_WARNING;
  const critPressure    = steamPressure > PHYSICS.STEAM_PRESSURE_CRITICAL;
  const warnVoid        = steamVoidFraction > 0.1;
  const critVoid        = steamVoidFraction > 0.3;
  const warnDrumLow     = drumSeparatorLevel < PHYSICS.DRUM_LEVEL_LOW;
  const warnDrumHigh    = drumSeparatorLevel > PHYSICS.DRUM_LEVEL_HIGH;
  const warnOZR         = reactivityMargin < PHYSICS.OZR_WARNING;
  const critOZR         = reactivityMargin < PHYSICS.OZR_MINIMUM_SAFE;
  const warnFlowLow     = coolantFlowRate < PHYSICS.BAZ_COOLANT_FLOW_MIN;
  const warnTurbineOver = turbineSpeed > PHYSICS.TURBINE_MAX_SPEED * 0.9;
  const warnXenon       = xenonConcentration > 0.4;
  const critXenon       = xenonConcentration > 0.7;

  const coreColor = critOverpower ? '#ff2020' : warnOverpower ? '#cc8800' : '#448844';
  const coreGlow  = powerFraction > 0.5
    ? `rgba(${critOverpower ? '255,32,32' : '204,136,0'},${Math.min(powerFraction * 0.3, 0.25)})`
    : 'none';

  const turbineSpinDur = turbineConnected && turbineSpeed > 5
    ? Math.max(2, 300 / turbineSpeed) : 0;

  // ── Layout constants ─────────────────────────────────────────
  const W = 620;
  const H = 398;          // taller to accommodate larger warning panel
  const WARN_H = 108;     // 4 rows × 20px + header 22px + padding

  // Component centres — all y-coords shifted +28 vs original
  const CORE = { x: 90,  y: 233, w: 80,  h: 110 };
  const DRUM = { x: 248, y: 218, w: 72,  h: 85  };
  const TURB = { x: 420, y: 198, r: 34  };
  const GEN  = { x: 530, y: 198, w: 50,  h: 42  };
  const COND = { x: 420, y: 333, w: 50,  h: 28  };
  const ECCS = { x: 22,  y: 203, w: 36,  h: 54  };

  const hotY        = CORE.y - 22;       // 211
  const coldReturnY = 368;
  const coldLeftX   = CORE.x - CORE.w / 2 - 10;  // 40

  // ── Tile grid geometry ───────────────────────────────────────
  // 11 columns × 4 rows, tiles packed with gaps
  const TW = 54;   // tile width
  const TH = 19;   // tile height (was 14 — bigger for readability)
  const TP = 55;   // column pitch  (TW + 1)
  const TR = 20;   // row pitch     (was 15)
  const TX0 = 3;   // first tile left edge
  const TY0 = 22;  // first tile top edge (below header line)

  const tx = (col: number) => TX0 + col * TP;
  const ty = (row: number) => TY0 + row * TR;

  // ── 44 warning tiles — 4 rows × 11 ──────────────────────────
  const tiles = [
    // Row 0 — Leistung & Reaktivität
    { label: 'ÜBERTG-W',  active: warnOverpower,    color: '#ffd700', blink: true  },
    { label: 'ÜBERTG-KR', active: critOverpower,    color: '#ff2020', blink: true  },
    { label: 'OZR-WARN',  active: warnOZR,          color: '#ffd700', blink: false },
    { label: 'OZR-KRIT',  active: critOZR,          color: '#ff2020', blink: true  },
    { label: 'XE-VERGIF', active: warnXenon,        color: '#ff8800', blink: false },
    { label: 'XE-KRIT',   active: critXenon,        color: '#ff2020', blink: true  },
    { label: 'AZ-5 AKT',  active: az5Active,        color: '#ff2020', blink: true  },
    { label: 'BAZ-BLKD',  active: !bazArmed,        color: '#ff5533', blink: false },
    { label: 'ECCS-AUS',  active: !eccsEnabled,     color: '#ff2020', blink: true  },
    { label: 'NOTKÜHL',   active: !eccsEnabled && (critOverpower || critCoolantTemp), color: '#ff2020', blink: true },
    { label: 'NOTSTROM',  active: generatorOutput < 5 && turbineConnected, color: '#ff8800', blink: false },

    // Row 1 — Thermik
    { label: 'KM-TEMP↑',  active: warnCoolantTemp,  color: '#ffd700', blink: true  },
    { label: 'KM-SIED',   active: critCoolantTemp,  color: '#ff2020', blink: true  },
    { label: 'BE-TEMP↑',  active: warnFuelTemp,     color: '#ffd700', blink: warnFuelTemp },
    { label: 'BE-KRIT',   active: critFuelTemp,     color: '#ff2020', blink: true  },
    { label: 'VOID-W',    active: warnVoid,         color: '#ffd700', blink: false },
    { label: 'VOID-KRIT', active: critVoid,         color: '#ff2020', blink: true  },
    { label: 'KERN-HEIT', active: fuelTemperature > 1000, color: '#ff8800', blink: false },
    { label: 'KAVITAT',   active: coolantTemperature > PHYSICS.COOLANT_TEMP_BOILING - PHYSICS.CAVITATION_SUBCOOLING_THRESHOLD, color: '#ff8800', blink: false },
    { label: 'KÜHL-ABF',  active: coolantFlowRate < PHYSICS.COOLANT_FLOW_NOMINAL * 0.7, color: '#ffd700', blink: false },
    { label: 'DAMPF-VD',  active: steamVoidFraction > 0.15, color: '#ff8800', blink: false },
    { label: 'T-DELTA↑',  active: fuelTemperature - coolantTemperature > 700, color: '#ff8800', blink: false },

    // Row 2 — Dampf & Wasser
    { label: 'DRUCK-W',   active: warnPressure,     color: '#ffd700', blink: false },
    { label: 'DRUCK-KR',  active: critPressure,     color: '#ff2020', blink: true  },
    { label: 'TROMM-LO',  active: warnDrumLow,      color: '#ffd700', blink: warnDrumLow },
    { label: 'TROMM-HI',  active: warnDrumHigh,     color: '#ffd700', blink: warnDrumHigh },
    { label: 'SPEISEW-W', active: feedWaterFlow < 200, color: '#ffd700', blink: false },
    { label: 'SPEISEW-HI',active: feedWaterFlow > 800, color: '#ffd700', blink: false },
    { label: 'DAMPF-LTG', active: steamPressure > 75, color: '#ff8800', blink: false },
    { label: 'KM-FLUSS↓', active: warnFlowLow,      color: '#ffd700', blink: true  },
    { label: 'UMLAUF',    active: activeCoolantPumps < 6, color: '#ffd700', blink: false },
    { label: 'TRB-AUSL',  active: turbineValveOpen === 0 && turbineConnected && turbineSpeed > 100, color: '#888888', blink: false },
    { label: 'LECK-SIG',  active: steamVoidFraction > 0.2 && fuelTemperature > 900, color: '#ff2020', blink: true  },

    // Row 3 — Pumpen & Systeme
    { label: 'MCP-1',     active: !pumpStates[0],   color: '#ff2020', blink: !pumpStates[0] },
    { label: 'MCP-2',     active: !pumpStates[1],   color: '#ff2020', blink: !pumpStates[1] },
    { label: 'MCP-3',     active: !pumpStates[2],   color: '#ff2020', blink: !pumpStates[2] },
    { label: 'MCP-4',     active: !pumpStates[3],   color: '#ff2020', blink: !pumpStates[3] },
    { label: 'MCP-5',     active: !pumpStates[4],   color: '#ff2020', blink: !pumpStates[4] },
    { label: 'MCP-6',     active: !pumpStates[5],   color: '#ff2020', blink: !pumpStates[5] },
    { label: 'MCP-7',     active: !pumpStates[6],   color: '#ff2020', blink: !pumpStates[6] },
    { label: 'MCP-8',     active: !pumpStates[7],   color: '#ff2020', blink: !pumpStates[7] },
    { label: 'TURB-DRZ',  active: warnTurbineOver,  color: '#ffd700', blink: true  },
    { label: 'GEN-AUS',   active: generatorOutput < 10 && turbineConnected, color: '#ff5533', blink: false },
    { label: 'NETZ-V',    active: generatorOutput < 5, color: '#ff2020', blink: false },
  ];

  return (
    <div style={{
      border: '1px solid var(--border)',
      padding: '6px',
      background: 'var(--surface)',
    }}>
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
        <span>SYNOPTISCHES SCHEMA — PRIMÄRKREISLAUF</span>
        <span style={{
          fontSize: '0.6rem',
          color: critOverpower || critFuelTemp || critPressure ? '#ff2020' : '#555',
        }}>
          {critOverpower || critFuelTemp || critPressure ? '▲ ALARM' : '● NORMAL'}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <defs>
          <marker id="arrowHot" viewBox="0 0 8 8" refX="7" refY="4"
            markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={pColor} />
          </marker>
          <marker id="arrowSteam" viewBox="0 0 8 8" refX="7" refY="4"
            markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={steamColor} />
          </marker>
          <marker id="arrowCold" viewBox="0 0 8 8" refX="7" refY="4"
            markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#2288cc" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glowStrong">
            <feGaussianBlur stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="ledGlow">
            <feGaussianBlur stdDeviation="1.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <pattern id="flowPattern" patternUnits="userSpaceOnUse" width="12" height="4">
            <rect width="12" height="4" fill="none"/>
            <rect width="6" height="4" fill={pColor} opacity="0.15">
              <animate attributeName="x" values="0;12" dur="0.8s" repeatCount="indefinite"/>
            </rect>
          </pattern>
          <radialGradient id="coreHeat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={critOverpower ? '#ff2020' : warnOverpower ? '#cc8800' : '#448844'} stopOpacity={powerFraction * 0.15}/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  WARNANZEIGEN — Chernobyl-style packed tile panel       */}
        {/* ═══════════════════════════════════════════════════════ */}
        {/* Panel background */}
        <rect x="2" y="2" width={W - 4} height={WARN_H} rx="2"
          fill="#060606" stroke="#1c1c1c" strokeWidth="1" />
        <rect x="3" y="3" width={W - 6} height={WARN_H - 2} rx="1.5"
          fill="none" stroke="#0f0f0f" strokeWidth="0.5" />

        {/* Panel title */}
        <text x="10" y="13" fill="#555" fontSize="7" fontFamily="monospace"
          letterSpacing="1.5" fontWeight="bold">
          WARNANZEIGEN
        </text>
        {/* Row category markers */}
        <text x={tx(0)} y={TY0 - 2} fill="#2a2a2a" fontSize="3.5" fontFamily="monospace">RLST</text>
        <text x={tx(0)} y={TY0 + TR - 2} fill="#2a2a2a" fontSize="3.5" fontFamily="monospace">THRM</text>
        <text x={tx(0)} y={TY0 + 2 * TR - 2} fill="#2a2a2a" fontSize="3.5" fontFamily="monospace">DMPF</text>
        <text x={tx(0)} y={TY0 + 3 * TR - 2} fill="#2a2a2a" fontSize="3.5" fontFamily="monospace">SYS</text>

        {/* Render all 44 tiles */}
        {tiles.map((tile, i) => {
          const col = i % 11;
          const row = Math.floor(i / 11);
          return (
            <WarningTile
              key={i}
              x={tx(col)} y={ty(row)}
              w={TW} h={TH}
              label={tile.label}
              active={tile.active}
              color={tile.color}
              blink={tile.blink}
            />
          );
        })}

        {/* Panel bottom border */}
        <line x1="3" y1={WARN_H + 2} x2={W - 3} y2={WARN_H + 2}
          stroke="#1a1a1a" strokeWidth="0.5" />

        {/* ============== */}
        {/*  ECCS SYSTEM   */}
        {/* ============== */}
        <rect x={ECCS.x - ECCS.w / 2} y={ECCS.y - ECCS.h / 2} width={ECCS.w} height={ECCS.h} rx="3"
          fill={eccsEnabled ? 'rgba(0,255,65,0.04)' : 'rgba(255,32,32,0.04)'}
          stroke={eccsEnabled ? '#00ff41' : '#ff2020'}
          strokeWidth="1" strokeDasharray={eccsEnabled ? 'none' : '4 2'} />
        <text x={ECCS.x} y={ECCS.y - 14} textAnchor="middle"
          fill={eccsEnabled ? '#00ff41' : '#ff2020'}
          fontSize="6" fontFamily="monospace" fontWeight="bold">ECCS</text>
        <circle cx={ECCS.x} cy={ECCS.y - 2} r="5"
          fill={eccsEnabled ? 'rgba(0,255,65,0.35)' : 'rgba(255,32,32,0.35)'}
          stroke={eccsEnabled ? '#00ff41' : '#ff2020'} strokeWidth="0.8"
          filter={eccsEnabled ? 'url(#glow)' : undefined}>
          {!eccsEnabled && (
            <animate attributeName="opacity" values="1;0.25;1" dur="1s" repeatCount="indefinite" />
          )}
        </circle>
        <text x={ECCS.x} y={ECCS.y + 1} textAnchor="middle"
          fill={eccsEnabled ? '#00ff41' : '#ff2020'}
          fontSize="4.5" fontFamily="monospace" fontWeight="bold">
          {eccsEnabled ? 'EIN' : 'AUS'}
        </text>
        <text x={ECCS.x} y={ECCS.y + 15} textAnchor="middle" fill="#444"
          fontSize="4" fontFamily="monospace">NOTSPEIS.</text>
        {/* ECCS pipe → core */}
        <path d={`M ${ECCS.x} ${ECCS.y + ECCS.h / 2} L ${ECCS.x} ${CORE.y} L ${CORE.x - CORE.w / 2} ${CORE.y}`}
          fill="none" stroke={eccsEnabled ? '#00ff41' : '#2a2a2a'}
          strokeWidth="2" strokeDasharray={eccsEnabled ? '4 2' : '2 4'}
          markerEnd={eccsEnabled ? 'url(#arrowCold)' : undefined} />

        {/* ================== */}
        {/*  REACTOR CORE      */}
        {/* ================== */}
        {/* Core heat aura */}
        <ellipse cx={CORE.x} cy={CORE.y} rx={CORE.w / 2 + 8} ry={CORE.h / 2 + 8}
          fill="url(#coreHeat)">
          {powerFraction > 0.3 && (
            <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
          )}
        </ellipse>
        <rect x={CORE.x - CORE.w / 2} y={CORE.y - CORE.h / 2}
          width={CORE.w} height={CORE.h} rx="5"
          fill={coreGlow} stroke={coreColor} strokeWidth="2.5" />
        <rect x={CORE.x - CORE.w / 2 + 3} y={CORE.y - CORE.h / 2 + 3}
          width={CORE.w - 6} height={CORE.h - 6} rx="3"
          fill="none" stroke={coreColor} strokeWidth="0.5" opacity="0.35" />
        {/* Fuel element lines */}
        {Array.from({ length: 11 }, (_, i) => CORE.y - CORE.h / 2 + 10 + i * 9).map((y) => (
          <g key={y}>
            <line x1={CORE.x - CORE.w / 2 + 8} y1={y}
              x2={CORE.x + CORE.w / 2 - 8} y2={y}
              stroke={powerFraction > 0.5 ? '#884400' : '#2a2a2a'} strokeWidth="0.8"
              opacity={0.25 + powerFraction * 0.4} />
            {powerFraction > 0.3 && (
              <line x1={CORE.x - CORE.w / 2 + 8} y1={y}
                x2={CORE.x - CORE.w / 2 + 8 + (CORE.w - 16) * Math.min(powerFraction, 1)} y2={y}
                stroke={coreColor} strokeWidth="0.5" opacity="0.3">
                <animate attributeName="opacity"
                  values={`${0.15 + powerFraction * 0.3};${0.05};${0.15 + powerFraction * 0.3}`}
                  dur="2s" repeatCount="indefinite" />
              </line>
            )}
          </g>
        ))}
        <text x={CORE.x} y={CORE.y - 32} textAnchor="middle" fill="var(--amber)"
          fontSize="7" fontFamily="monospace" fontWeight="bold">REAKTORKERN</text>
        <text x={CORE.x} y={CORE.y - 10} textAnchor="middle"
          fill={critOverpower ? '#ff2020' : warnOverpower ? '#ffd700' : 'var(--amber)'}
          fontSize="14" fontFamily="monospace" fontWeight="bold"
          filter={critOverpower ? 'url(#glowStrong)' : undefined}>
          {thermalPower.toFixed(0)}
        </text>
        <text x={CORE.x} y={CORE.y - 1} textAnchor="middle" fill="#777"
          fontSize="5" fontFamily="monospace">MW(th)</text>
        <text x={CORE.x} y={CORE.y + 14} textAnchor="middle"
          fill={warnCoolantTemp ? (critCoolantTemp ? '#ff2020' : '#ffd700') : '#4488aa'}
          fontSize="8" fontFamily="monospace">
          {coolantTemperature.toFixed(1)}°C
        </text>
        <text x={CORE.x} y={CORE.y + 22} textAnchor="middle" fill="#555"
          fontSize="4" fontFamily="monospace">KÜHLMITTEL</text>
        <text x={CORE.x} y={CORE.y + 35} textAnchor="middle"
          fill={critFuelTemp ? '#ff2020' : warnFuelTemp ? '#ffd700' : '#cc6600'}
          fontSize="8" fontFamily="monospace">
          {fuelTemperature.toFixed(0)}°C
        </text>
        <text x={CORE.x} y={CORE.y + 43} textAnchor="middle" fill="#555"
          fontSize="4" fontFamily="monospace">BRENNSTOFF</text>

        {/* Void fraction bar — right edge of core */}
        <rect x={CORE.x + CORE.w / 2 + 4} y={CORE.y - CORE.h / 2}
          width="8" height={CORE.h} rx="2"
          fill="#0a0a0a" stroke="#2a2a2a" strokeWidth="0.6" />
        <rect x={CORE.x + CORE.w / 2 + 5}
          y={CORE.y - CORE.h / 2 + 1 + (CORE.h - 2) * (1 - steamVoidFraction)}
          width="6" height={(CORE.h - 2) * steamVoidFraction} rx="1.5"
          fill={steamVoidFraction > 0.3 ? '#ff2020' : steamVoidFraction > 0.1 ? '#ffd700' : '#4488aa'}
          opacity="0.75">
          {steamVoidFraction > 0.1 && (
            <animate attributeName="opacity" values="0.75;0.35;0.75" dur="1.5s" repeatCount="indefinite" />
          )}
        </rect>
        <text x={CORE.x + CORE.w / 2 + 8} y={CORE.y - CORE.h / 2 - 4}
          textAnchor="middle" fill="#666" fontSize="4" fontFamily="monospace">VOID</text>
        <text x={CORE.x + CORE.w / 2 + 8} y={CORE.y + CORE.h / 2 + 9}
          textAnchor="middle" fill={warnVoid ? '#ffd700' : '#666'}
          fontSize="5" fontFamily="monospace">{(steamVoidFraction * 100).toFixed(0)}%</text>

        {/* =============================== */}
        {/*  HOT LEG → DRUM SEPARATOR       */}
        {/* =============================== */}
        <path d={`M ${CORE.x + CORE.w / 2 + 14} ${hotY}
                   L ${DRUM.x - DRUM.w / 2} ${hotY}`}
          fill="none" stroke={pColor} strokeWidth={pw}
          markerEnd="url(#arrowHot)" />
        <text x={(CORE.x + CORE.w / 2 + DRUM.x - DRUM.w / 2) / 2} y={hotY - 6}
          textAnchor="middle" fill="#666" fontSize="5" fontFamily="monospace">
          HEISSER STRANG
        </text>
        <text x={(CORE.x + CORE.w / 2 + DRUM.x - DRUM.w / 2) / 2} y={hotY + 8}
          textAnchor="middle" fill={pColor} fontSize="4.5" fontFamily="monospace">
          {coolantTemperature.toFixed(0)}°C → {coolantFlowRate.toFixed(0)} L/s
        </text>

        {/* ==================== */}
        {/*  DRUM SEPARATOR      */}
        {/* ==================== */}
        <rect x={DRUM.x - DRUM.w / 2} y={DRUM.y - DRUM.h / 2}
          width={DRUM.w} height={DRUM.h} rx="14"
          fill="none" stroke="#4488aa" strokeWidth="2" />
        <rect x={DRUM.x - DRUM.w / 2 + 2} y={DRUM.y - DRUM.h / 2 + 2}
          width={DRUM.w - 4} height={DRUM.h - 4} rx="12"
          fill="none" stroke="#4488aa" strokeWidth="0.4" opacity="0.3" />
        <text x={DRUM.x} y={DRUM.y - 24} textAnchor="middle" fill="#4488aa"
          fontSize="6" fontFamily="monospace" fontWeight="bold">TROMMEL</text>
        <text x={DRUM.x} y={DRUM.y - 16} textAnchor="middle" fill="#4488aa"
          fontSize="6" fontFamily="monospace" fontWeight="bold">ABSCHEIDER</text>
        {/* Water level fill */}
        {(() => {
          const rx = DRUM.x - DRUM.w / 2 + 5;
          const fullH = DRUM.h - 10;
          const topY = DRUM.y - DRUM.h / 2 + 5;
          const fillH = fullH * drumSeparatorLevel / 100;
          const waveY = topY + fullH - fillH;
          return (
            <>
              <rect x={rx} y={waveY} width={DRUM.w - 10} height={fillH}
                fill="rgba(34,136,204,0.14)" rx="6" />
              <line x1={rx + 2} y1={waveY} x2={rx + DRUM.w - 12} y2={waveY}
                stroke="rgba(34,136,204,0.35)" strokeWidth="1">
                <animate attributeName="y1" values={`${waveY};${waveY - 1};${waveY}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="y2" values={`${waveY};${waveY + 1};${waveY}`} dur="2s" repeatCount="indefinite" />
              </line>
            </>
          );
        })()}
        {/* Level markers */}
        {[20, 50, 80].map(lvl => {
          const fullH = DRUM.h - 10;
          const topY = DRUM.y - DRUM.h / 2 + 5;
          const markY = topY + fullH * (1 - lvl / 100);
          return (
            <g key={lvl}>
              <line x1={DRUM.x - DRUM.w / 2 + 5} y1={markY}
                x2={DRUM.x + DRUM.w / 2 - 5} y2={markY}
                stroke={lvl === 50 ? '#4488aa' : '#2a2a2a'} strokeWidth="0.4" strokeDasharray="3 2" />
              <text x={DRUM.x + DRUM.w / 2 - 3} y={markY + 2}
                textAnchor="start" fill="#333" fontSize="3.5" fontFamily="monospace">{lvl}</text>
            </g>
          );
        })}
        <text x={DRUM.x} y={DRUM.y + 10} textAnchor="middle"
          fill={warnDrumLow || warnDrumHigh ? '#ffd700' : '#4488aa'}
          fontSize="12" fontFamily="monospace" fontWeight="bold">
          {drumSeparatorLevel.toFixed(0)}%
        </text>
        <text x={DRUM.x} y={DRUM.y + 20} textAnchor="middle" fill="#555"
          fontSize="4" fontFamily="monospace">NIVEAU</text>

        {/* =============================== */}
        {/*  STEAM LINE → VALVE → TURBINE   */}
        {/* =============================== */}
        {(() => {
          const steamY = DRUM.y - DRUM.h / 2 + 14;
          const valveX = 340;
          const valveW = 24;
          const valveH = 22;
          return (
            <>
              {/* Steam pipe drum → valve */}
              <path d={`M ${DRUM.x + DRUM.w / 2} ${steamY} L ${valveX - valveW / 2} ${steamY}`}
                fill="none" stroke={steamColor} strokeWidth="2.5"
                strokeDasharray={turbineValveOpen > 0 ? '6 2' : '2 5'} />
              <text x={(DRUM.x + DRUM.w / 2 + valveX) / 2} y={steamY - 7}
                textAnchor="middle" fill="#888" fontSize="6" fontFamily="monospace">
                {steamPressure.toFixed(1)} bar
              </text>
              {/* Steam valve */}
              <rect x={valveX - valveW / 2} y={steamY - valveH / 2}
                width={valveW} height={valveH} rx="3"
                fill={turbineValveOpen > 0 ? `${steamColor}12` : '#0a0a0a'}
                stroke={turbineValveOpen > 0 ? steamColor : '#444'} strokeWidth="1.2" />
              <polygon
                points={`${valveX - 7},${steamY - 6} ${valveX + 2},${steamY} ${valveX - 7},${steamY + 6}`}
                fill="none" stroke={turbineValveOpen > 0 ? steamColor : '#444'} strokeWidth="1" />
              <polygon
                points={`${valveX + 7},${steamY - 6} ${valveX - 2},${steamY} ${valveX + 7},${steamY + 6}`}
                fill="none" stroke={turbineValveOpen > 0 ? steamColor : '#444'} strokeWidth="1" />
              <text x={valveX} y={steamY + valveH / 2 + 10} textAnchor="middle"
                fill={turbineValveOpen > 0 ? steamColor : '#555'}
                fontSize="5" fontFamily="monospace" fontWeight="bold">
                {turbineValveOpen > 0 ? `AUF ${turbineValveOpen}%` : 'GESCHL.'}
              </text>
              {/* Valve → turbine pipe */}
              <path d={`M ${valveX + valveW / 2} ${steamY}
                         L ${TURB.x - TURB.r - 4} ${steamY}
                         L ${TURB.x - TURB.r - 4} ${TURB.y}`}
                fill="none" stroke={steamColor} strokeWidth="2.5"
                strokeDasharray={turbineValveOpen > 0 ? '5 2' : '2 5'}
                markerEnd="url(#arrowSteam)" />
            </>
          );
        })()}

        {/* ══════════════════════════════ */}
        {/*  TURBINE — SPINNING BLADES     */}
        {/* ══════════════════════════════ */}
        <circle cx={TURB.x} cy={TURB.y} r={TURB.r}
          fill={turbineConnected ? 'rgba(68,170,68,0.05)' : 'rgba(170,68,68,0.05)'}
          stroke={turbineConnected ? '#44aa44' : '#aa4444'} strokeWidth="2.2" />
        <circle cx={TURB.x} cy={TURB.y} r={TURB.r - 3}
          fill="none" stroke={turbineConnected ? '#44aa44' : '#aa4444'}
          strokeWidth="0.5" opacity="0.3" />
        <g>
          {turbineSpinDur > 0 && (
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${TURB.x} ${TURB.y}`} to={`360 ${TURB.x} ${TURB.y}`}
              dur={`${turbineSpinDur}s`} repeatCount="indefinite" />
          )}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
            const rad = (angle * Math.PI) / 180;
            const bc = turbineConnected ? (warnTurbineOver ? '#ffd700' : '#44aa44') : '#333';
            const innerR = 7;
            const outerR = TURB.r - 5;
            const perpOuter = 2.5;
            const cx1 = TURB.x + Math.cos(rad) * innerR;
            const cy1 = TURB.y + Math.sin(rad) * innerR;
            const cx2 = TURB.x + Math.cos(rad) * outerR;
            const cy2 = TURB.y + Math.sin(rad) * outerR;
            const nx = -Math.sin(rad);
            const ny = Math.cos(rad);
            return (
              <polygon key={angle}
                points={`${cx1},${cy1} ${cx2 + nx * perpOuter},${cy2 + ny * perpOuter} ${cx2 - nx * perpOuter},${cy2 - ny * perpOuter}`}
                fill={`${bc}22`} stroke={bc} strokeWidth="0.8" strokeLinejoin="round" />
            );
          })}
        </g>
        <circle cx={TURB.x} cy={TURB.y} r="6"
          fill="#0e0e0e" stroke={turbineConnected ? '#44aa44' : '#444'} strokeWidth="1.5" />
        <circle cx={TURB.x} cy={TURB.y} r="2.5"
          fill={turbineConnected ? '#44aa44' : '#333'} opacity="0.5" />
        {/* Labels below turbine */}
        <text x={TURB.x} y={TURB.y + TURB.r + 13} textAnchor="middle"
          fill={turbineConnected ? '#00ff41' : '#ff2020'}
          fontSize="6" fontFamily="monospace" fontWeight="bold">
          TURBOGENERATOR 8
        </text>
        <text x={TURB.x} y={TURB.y + TURB.r + 23} textAnchor="middle"
          fill={warnTurbineOver ? '#ffd700' : (turbineConnected ? '#00ff41' : '#ff2020')}
          fontSize="8" fontFamily="monospace" fontWeight="bold">
          {turbineSpeed.toFixed(0)} RPM
        </text>
        <text x={TURB.x} y={TURB.y + TURB.r + 32} textAnchor="middle"
          fill={turbineConnected ? '#00ff41' : '#ff2020'}
          fontSize="5" fontFamily="monospace">
          {turbineConnected ? '● VERBUNDEN' : '○ GETRENNT'}
        </text>

        {/* ══════════════════════════ */}
        {/*  GENERATOR + POWER OUT     */}
        {/* ══════════════════════════ */}
        <line x1={TURB.x + TURB.r} y1={TURB.y} x2={GEN.x - GEN.w / 2} y2={TURB.y}
          stroke="#444" strokeWidth="3" />
        <rect x={GEN.x - GEN.w / 2} y={GEN.y - GEN.h / 2}
          width={GEN.w} height={GEN.h} rx="4"
          fill="rgba(255,140,0,0.04)" stroke="var(--amber)" strokeWidth="1.5" />
        <rect x={GEN.x - GEN.w / 2 + 2} y={GEN.y - GEN.h / 2 + 2}
          width={GEN.w - 4} height={GEN.h - 4} rx="3"
          fill="none" stroke="var(--amber)" strokeWidth="0.3" opacity="0.3" />
        <text x={GEN.x} y={GEN.y - 8} textAnchor="middle" fill="var(--amber)"
          fontSize="7" fontFamily="monospace" fontWeight="bold">GEN</text>
        <text x={GEN.x} y={GEN.y + 3} textAnchor="middle" fill="var(--amber)"
          fontSize="12" fontFamily="monospace" fontWeight="bold">~</text>
        {generatorOutput > 5 && (
          <circle cx={GEN.x} cy={GEN.y} r="14" fill="none"
            stroke="var(--amber)" strokeWidth="0.4" opacity="0.3">
            <animate attributeName="r" values="10;16;10" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.05;0.3" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
        <text x={GEN.x} y={GEN.y + 14} textAnchor="middle" fill="var(--amber)"
          fontSize="7" fontFamily="monospace" fontWeight="bold">{generatorOutput.toFixed(0)} MWe</text>
        <line x1={GEN.x + GEN.w / 2} y1={GEN.y} x2={GEN.x + GEN.w / 2 + 24} y2={GEN.y}
          stroke={generatorOutput > 10 ? 'var(--warning-yellow)' : '#333'} strokeWidth="2.5" />
        {generatorOutput > 10 && (
          <line x1={GEN.x + GEN.w / 2} y1={GEN.y} x2={GEN.x + GEN.w / 2 + 24} y2={GEN.y}
            stroke="var(--warning-yellow)" strokeWidth="1" opacity="0.4">
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.8s" repeatCount="indefinite" />
          </line>
        )}
        <text x={GEN.x + GEN.w / 2 + 32} y={GEN.y - 4}
          fill={generatorOutput > 10 ? 'var(--warning-yellow)' : '#555'}
          fontSize="9" fontFamily="monospace">⚡</text>
        <text x={GEN.x + GEN.w / 2 + 32} y={GEN.y + 7}
          fill={generatorOutput > 10 ? 'var(--warning-yellow)' : '#555'}
          fontSize="5" fontFamily="monospace">NETZ</text>

        {/* ======================================= */}
        {/*  EXHAUST → CONDENSER → FEEDWATER RETURN */}
        {/* ======================================= */}
        <path d={`M ${TURB.x} ${TURB.y + TURB.r} L ${TURB.x} ${COND.y - COND.h / 2}`}
          fill="none" stroke="#2288cc" strokeWidth="2" />
        <text x={TURB.x + 16} y={(TURB.y + TURB.r + COND.y - COND.h / 2) / 2}
          fill="#555" fontSize="4" fontFamily="monospace">ABDAMPF</text>

        {/* Condenser */}
        <rect x={COND.x - COND.w / 2} y={COND.y - COND.h / 2}
          width={COND.w} height={COND.h} rx="3"
          fill="rgba(34,136,204,0.05)" stroke="#4488aa" strokeWidth="1.2" />
        {[0, 1, 2].map(i => (
          <line key={i}
            x1={COND.x - COND.w / 2 + 6} y1={COND.y - 6 + i * 6}
            x2={COND.x + COND.w / 2 - 6} y2={COND.y - 6 + i * 6}
            stroke="#2288cc" strokeWidth="0.4" opacity="0.3" />
        ))}
        <text x={COND.x} y={COND.y - 2} textAnchor="middle" fill="#4488aa"
          fontSize="5.5" fontFamily="monospace" fontWeight="bold">KONDENSATOR</text>
        <text x={COND.x} y={COND.y + 7} textAnchor="middle" fill="#4488aa"
          fontSize="4" fontFamily="monospace">K-2</text>

        {/* Condenser → feedwater return */}
        <path d={`M ${COND.x} ${COND.y + COND.h / 2}
                   L ${COND.x} ${coldReturnY}
                   L ${DRUM.x} ${coldReturnY}
                   L ${DRUM.x} ${DRUM.y + DRUM.h / 2}`}
          fill="none" stroke="#2288cc" strokeWidth="2"
          markerEnd="url(#arrowCold)" />
        <text x={(COND.x + DRUM.x) / 2} y={coldReturnY - 5}
          textAnchor="middle" fill="#666" fontSize="5" fontFamily="monospace">
          SPEISEWASSER {feedWaterFlow.toFixed(0)} L/s
        </text>

        {/* ============================== */}
        {/*  COLD LEG — DRUM → MCP → CORE  */}
        {/* ============================== */}
        <path d={`M ${DRUM.x - DRUM.w / 2} ${DRUM.y + 18}
                   L ${DRUM.x - DRUM.w / 2 - 18} ${DRUM.y + 18}
                   L ${DRUM.x - DRUM.w / 2 - 18} ${coldReturnY - 30}
                   L ${coldLeftX} ${coldReturnY - 30}
                   L ${coldLeftX} ${CORE.y + CORE.h / 2 - 10}
                   L ${CORE.x - CORE.w / 2} ${CORE.y + CORE.h / 2 - 10}`}
          fill="none" stroke="#2288cc" strokeWidth={pw}
          markerEnd="url(#arrowCold)" />
        {/* MCP label + pump count */}
        <text x={(coldLeftX + DRUM.x - DRUM.w / 2 - 18) / 2 + 10} y={coldReturnY - 36}
          textAnchor="middle" fill={warnFlowLow ? '#ffd700' : '#777'}
          fontSize="6" fontFamily="monospace" fontWeight="bold">
          MCP {activeCoolantPumps}/8
        </text>
        <text x={(coldLeftX + DRUM.x - DRUM.w / 2 - 18) / 2 + 10} y={coldReturnY - 28}
          textAnchor="middle" fill={warnFlowLow ? '#ffd700' : '#666'}
          fontSize="5" fontFamily="monospace">
          {coolantFlowRate.toFixed(0)} L/s
        </text>

        {/* Pump indicators */}
        {pumpStates.map((active, i) => {
          const px = coldLeftX + 12 + i * 20;
          const py = coldReturnY - 14;
          return (
            <g key={i}>
              <rect x={px - 8} y={py - 7} width="16" height="14" rx="2"
                fill={active ? 'rgba(0,255,65,0.06)' : 'rgba(255,32,32,0.06)'}
                stroke={active ? '#00ff41' : '#ff2020'} strokeWidth="0.8" />
              <circle cx={px} cy={py} r="4"
                fill="none" stroke={active ? '#00ff41' : '#ff2020'} strokeWidth="0.6" />
              {active ? (
                <g>
                  <line x1={px - 2.5} y1={py} x2={px + 2.5} y2={py}
                    stroke="#00ff41" strokeWidth="0.6">
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${px} ${py}`} to={`360 ${px} ${py}`}
                      dur="1s" repeatCount="indefinite" />
                  </line>
                  <line x1={px} y1={py - 2.5} x2={px} y2={py + 2.5}
                    stroke="#00ff41" strokeWidth="0.6">
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${px} ${py}`} to={`360 ${px} ${py}`}
                      dur="1s" repeatCount="indefinite" />
                  </line>
                </g>
              ) : (
                <line x1={px - 2} y1={py - 2} x2={px + 2} y2={py + 2}
                  stroke="#ff2020" strokeWidth="0.5" />
              )}
              <text x={px} y={py + 11} textAnchor="middle"
                fill={active ? '#00ff41' : '#ff2020'}
                fontSize="3.5" fontFamily="monospace" fontWeight="bold">
                ГЦН-{i + 1}
              </text>
            </g>
          );
        })}

        {/* ============= */}
        {/*  OUTER FRAME  */}
        {/* ============= */}
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="3"
          fill="none" stroke="var(--border)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
