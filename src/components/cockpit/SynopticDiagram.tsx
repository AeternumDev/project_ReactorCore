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
  return Math.max(1, Math.min(4, (flowRate / PHYSICS.COOLANT_FLOW_NOMINAL) * 3));
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
}: SynopticDiagramProps) {
  const powerFraction = thermalPower / PHYSICS.MAX_THERMAL_POWER;
  const pColor = flowColor(coolantTemperature);
  const pw = pipeWidth(coolantFlowRate);

  // Dampffarbe
  const steamColor = steamVoidFraction > 0.3 ? '#cc4400' :
    steamVoidFraction > 0.1 ? '#ccaa00' : '#888';

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '8px',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.75rem',
          marginBottom: '6px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '4px',
        }}
      >
        SYNOPTISCHES SCHEMA — PRIMÄRKREISLAUF
      </div>

      <svg
        viewBox="0 0 440 200"
        width="100%"
        style={{ maxHeight: '340px' }}
      >
        {/* Definitionen */}
        <defs>
          <marker id="arrowFlow" viewBox="0 0 6 6" refX="3" refY="3"
            markerWidth="4" markerHeight="4" orient="auto-start-auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={pColor} />
          </marker>
          <marker id="arrowSteam" viewBox="0 0 6 6" refX="3" refY="3"
            markerWidth="4" markerHeight="4" orient="auto-start-auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={steamColor} />
          </marker>
        </defs>

        {/* === REAKTORKERN === */}
        <rect x="40" y="50" width="60" height="80" rx="4"
          fill="none"
          stroke={powerFraction > 0.8 ? '#ff4444' : powerFraction > 0.5 ? '#cc8800' : '#448844'}
          strokeWidth="2"
        />
        <text x="70" y="75" textAnchor="middle" fill="var(--amber)"
          fontSize="7" fontFamily="monospace">REAKTOR</text>
        <text x="70" y="88" textAnchor="middle"
          fill={powerFraction > 0.8 ? '#ff4444' : 'var(--amber)'}
          fontSize="9" fontFamily="monospace">
          {thermalPower.toFixed(0)} MW
        </text>
        <text x="70" y="100" textAnchor="middle" fill="#666"
          fontSize="6" fontFamily="monospace">
          {coolantTemperature.toFixed(0)}°C
        </text>

        {/* Brennelemente im Kern (stilisiert) */}
        {[50, 58, 66, 74, 82, 90].map((y) => (
          <line key={y} x1="48" y1={y} x2="92" y2={y}
            stroke={powerFraction > 0.5 ? '#884400' : '#444'} strokeWidth="1" opacity="0.4" />
        ))}

        {/* === HEISSER STRANG → TROMMELABSCHEIDER === */}
        <line x1="100" y1="70" x2="160" y2="70"
          stroke={pColor} strokeWidth={pw} markerEnd="url(#arrowFlow)" />
        <text x="130" y="65" textAnchor="middle" fill="#666"
          fontSize="5" fontFamily="monospace">HEISS</text>

        {/* === TROMMELABSCHEIDER (links) === */}
        <rect x="160" y="40" width="50" height="55" rx="8"
          fill="none" stroke="#4488aa" strokeWidth="1.5" />
        <text x="185" y="55" textAnchor="middle" fill="#4488aa"
          fontSize="6" fontFamily="monospace">TROMMEL</text>
        <text x="185" y="65" textAnchor="middle" fill="#4488aa"
          fontSize="6" fontFamily="monospace">ABSCHEIDER</text>
        {/* Wasserstand */}
        <rect x="164" y={44 + 47 * (1 - drumSeparatorLevel / 100)}
          width="42" height={47 * drumSeparatorLevel / 100}
          fill="rgba(34,136,204,0.15)" rx="4" />
        <text x="185" y="82" textAnchor="middle" fill="#4488aa"
          fontSize="8" fontFamily="monospace">{drumSeparatorLevel.toFixed(0)}%</text>

        {/* === DAMPFLEITUNG → TURBINE === */}
        <line x1="210" y1="55" x2="290" y2="55"
          stroke={steamColor} strokeWidth="2"
          strokeDasharray={turbineValveOpen > 0 ? '4 2' : '2 4'}
          markerEnd="url(#arrowSteam)" />
        <text x="250" y="50" textAnchor="middle" fill="#666"
          fontSize="5" fontFamily="monospace">DAMPF {steamPressure.toFixed(0)} bar</text>

        {/* Dampfventil */}
        <rect x="255" y="48" width="14" height="14" rx="2"
          fill="none" stroke={turbineValveOpen > 0 ? steamColor : '#444'}
          strokeWidth="1" />
        <text x="262" y="58" textAnchor="middle"
          fill={turbineValveOpen > 0 ? steamColor : '#444'}
          fontSize="5" fontFamily="monospace">
          {turbineValveOpen > 0 ? 'AUF' : 'ZU'}
        </text>

        {/* === TURBINE === */}
        <circle cx="310" cy="55" r="22"
          fill="none"
          stroke={turbineConnected ? '#44aa44' : '#aa4444'}
          strokeWidth="1.5"
        />
        {/* Turbinenschaufeln (rotierend) */}
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line key={angle}
              x1={310 + Math.cos(rad) * 5}
              y1={55 + Math.sin(rad) * 5}
              x2={310 + Math.cos(rad) * 18}
              y2={55 + Math.sin(rad) * 18}
              stroke={turbineConnected ? '#44aa44' : '#444'}
              strokeWidth="1.5"
            />
          );
        })}
        <text x="310" y="85" textAnchor="middle"
          fill={turbineConnected ? 'var(--safe-green)' : 'var(--alarm-red)'}
          fontSize="6" fontFamily="monospace">
          TURBINE {turbineSpeed.toFixed(0)} RPM
        </text>

        {/* === GENERATOR === */}
        <line x1="332" y1="55" x2="360" y2="55" stroke="#666" strokeWidth="1.5" />
        <rect x="360" y="42" width="30" height="26" rx="3"
          fill="none" stroke="var(--amber)" strokeWidth="1" />
        <text x="375" y="55" textAnchor="middle" fill="var(--amber)"
          fontSize="5" fontFamily="monospace">GEN</text>
        <text x="375" y="63" textAnchor="middle" fill="var(--amber)"
          fontSize="4" fontFamily="monospace">~</text>
        {/* Blitz-Symbol für Strom */}
        <text x="400" y="58" fill="var(--warning-yellow)"
          fontSize="10" fontFamily="monospace">⚡</text>

        {/* === KALTER STRANG ZURÜCK === */}
        {/* Kondensat zurück nach unten */}
        <line x1="310" y1="77" x2="310" y2="160"
          stroke="#2288cc" strokeWidth="1.5" />
        <text x="320" y="120" fill="#666"
          fontSize="5" fontFamily="monospace">KONDENSAT</text>

        {/* Speisewasser zurück zum Trommelabscheider */}
        <line x1="310" y1="160" x2="185" y2="160"
          stroke="#2288cc" strokeWidth="1.5" markerEnd="url(#arrowFlow)" />
        <line x1="185" y1="160" x2="185" y2="95"
          stroke="#2288cc" strokeWidth="1.5" />
        <text x="245" y="155" textAnchor="middle" fill="#666"
          fontSize="5" fontFamily="monospace">SPEISEWASSER {feedWaterFlow.toFixed(0)} L/s</text>

        {/* === KÜHLMITTELPUMPEN === */}
        {/* Kalter Strang vom Trommelabscheider zurück zum Kern */}
        <line x1="160" y1="100" x2="160" y2="140"
          stroke="#2288cc" strokeWidth={pw} />
        <line x1="160" y1="140" x2="35" y2="140"
          stroke="#2288cc" strokeWidth={pw} />
        <line x1="35" y1="140" x2="35" y2="110"
          stroke="#2288cc" strokeWidth={pw}  />
        <line x1="35" y1="110" x2="55" y2="110"
          stroke="#2288cc" strokeWidth={pw} markerEnd="url(#arrowFlow)" />
        {/* Verbindung zurück in den Kern */}
        <line x1="55" y1="110" x2="55" y2="130"
          stroke="#2288cc" strokeWidth={pw} />

        <text x="95" y="148" textAnchor="middle" fill="#666"
          fontSize="5" fontFamily="monospace">
          MCP {activeCoolantPumps}/8 ({coolantFlowRate.toFixed(0)} L/s)
        </text>

        {/* Pumpen-Indikatoren */}
        {pumpStates.map((active, i) => {
          const px = 45 + i * 15;
          return (
            <g key={i}>
              <circle cx={px} cy="165" r="4"
                fill={active ? 'rgba(0,255,65,0.2)' : 'rgba(255,32,32,0.2)'}
                stroke={active ? 'var(--safe-green)' : 'var(--alarm-red)'}
                strokeWidth="0.8" />
              <text x={px} y="167" textAnchor="middle"
                fill={active ? 'var(--safe-green)' : 'var(--alarm-red)'}
                fontSize="4" fontFamily="monospace">
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* === ECCS === */}
        <line x1="20" y1="30" x2="20" y2="90"
          stroke={eccsEnabled ? 'var(--safe-green)' : '#333'}
          strokeWidth="1.5"
          strokeDasharray={eccsEnabled ? '3 2' : '2 4'}
        />
        <line x1="20" y1="90" x2="40" y2="90"
          stroke={eccsEnabled ? 'var(--safe-green)' : '#333'}
          strokeWidth="1.5"
          markerEnd={eccsEnabled ? 'url(#arrowFlow)' : undefined}
        />
        <text x="20" y="25" textAnchor="middle"
          fill={eccsEnabled ? 'var(--safe-green)' : '#555'}
          fontSize="6" fontFamily="monospace">ECCS</text>
        <circle cx="20" cy="18" r="3"
          fill={eccsEnabled ? 'var(--safe-green)' : 'var(--alarm-red)'}
          opacity={eccsEnabled ? 1 : 0.5} />

        {/* === BESCHRIFTUNGSRAHMEN === */}
        <rect x="1" y="1" width="438" height="198" rx="2"
          fill="none" stroke="var(--border)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
