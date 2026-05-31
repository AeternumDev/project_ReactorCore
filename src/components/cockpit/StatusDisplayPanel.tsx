'use client';

import { PHYSICS } from '@/lib/physics/constants';

interface StatusDisplayPanelProps {
  thermalPower: number;
  xenonConcentration: number;
  steamPressure: number;
  elapsedSeconds: number;
  coolantTemperature: number;
  fuelTemperature: number;
  coolantFlowRate: number;
  steamVoidFraction: number;
  neutronFlux: number;
  generatorOutput: number;
  reactivityMargin: number;
  controlRods: number;
  manualRods: number;
  az5Triggered: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatXenonPercent(xenonConcentration: number): string {
  return `${(xenonConcentration * 100).toFixed(0)} %`;
}

function getColorForPower(power: number): string {
  if (power > PHYSICS.TEST_POWER_MAX) return 'var(--warning-yellow)';
  if (power >= PHYSICS.TEST_POWER_MIN) return 'var(--safe-green)';
  if (power > 50) return 'var(--warning-yellow)';
  return 'var(--alarm-red)';
}

function getColorForXenon(xc: number): string {
  // Xe = 1.0 ist Gleichgewicht (normal). Pit ≥ 1.5 = gefährlich, ≥ 2.5 = un-restartable.
  if (xc > PHYSICS.XENON_SEVERE_CONCENTRATION) return 'var(--alarm-red)';
  if (xc > PHYSICS.XENON_WARNING_CONCENTRATION) return 'var(--warning-yellow)';
  return 'var(--amber)';
}

function getColorForPressure(p: number): string {
  if (p > PHYSICS.STEAM_PRESSURE_CRITICAL) return 'var(--alarm-red)';
  if (p > PHYSICS.STEAM_PRESSURE_WARNING) return 'var(--warning-yellow)';
  return 'var(--amber)';
}

function getColorForTemp(t: number, warning: number, critical: number): string {
  if (t > critical) return 'var(--alarm-red)';
  if (t > warning) return 'var(--warning-yellow)';
  return 'var(--amber)';
}

interface DisplayProps {
  label: string;
  value: string;
  color: string;
  blink?: boolean;
  small?: boolean;
}

function Display({ label, value, color, blink, small }: DisplayProps) {
  return (
    <div
      style={{
        border: '1px solid var(--amber)',
        background: 'var(--bg)',
        padding: small ? '4px 6px' : '6px 8px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.6rem',
          color: '#666',
          marginBottom: '2px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        className={`seven-segment ${blink ? 'animate-blink' : ''}`}
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: small ? '1.2rem' : '1.5rem',
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function StatusDisplayPanel({
  thermalPower,
  xenonConcentration,
  steamPressure,
  elapsedSeconds,
  coolantTemperature,
  fuelTemperature,
  coolantFlowRate,
  steamVoidFraction,
  neutronFlux,
  generatorOutput,
  reactivityMargin,
  az5Triggered,
}: StatusDisplayPanelProps) {
  const remaining = PHYSICS.TEST_DURATION_SECONDS - elapsedSeconds;
  const isLastMinute = remaining <= 60 && remaining > 0;

  // --- Operator guidance ---
  function getGuidanceMessage(): { text: string; color: string } {
    if (az5Triggered) {
      return { text: `AZ-5 AUSGELÖST — TRANSIENT UND KÜHLUNG ÜBERWACHEN`, color: 'var(--alarm-red)' };
    }
    if (thermalPower <= PHYSICS.XENON_STALL_POWER) {
      return { text: `REAKTOR GESTALLT — VORSCHRIFT ERWARTET AZ-5`, color: 'var(--alarm-red)' };
    }
    if (thermalPower < PHYSICS.TEST_POWER_MIN) {
      if (xenonConcentration > PHYSICS.XENON_WARNING_CONCENTRATION) {
        return { text: `LEISTUNG UNTER ${PHYSICS.TEST_POWER_TARGET} MW — XENON DRÜCKT, MR/USP AUSFAHREN SENKT OZR`, color: 'var(--warning-yellow)' };
      }
      return { text: `LEISTUNG UNTER ${PHYSICS.TEST_POWER_TARGET} MW — MR-STÄBE VORSICHTIG AUSFAHREN`, color: 'var(--warning-yellow)' };
    }
    if (thermalPower > PHYSICS.TEST_POWER_MAX) {
      return { text: `LEISTUNG ÜBER ${PHYSICS.TEST_POWER_TARGET} MW — MR-STÄBE EINFAHREN`, color: 'var(--warning-yellow)' };
    }
    if (xenonConcentration > PHYSICS.XENON_WARNING_CONCENTRATION && reactivityMargin < PHYSICS.OZR_WARNING) {
      return { text: `ZIEL ${PHYSICS.TEST_POWER_TARGET} MW — XENON UND OZR IM WARNBEREICH`, color: 'var(--warning-yellow)' };
    }
    if (reactivityMargin < PHYSICS.OZR_WARNING) {
      return { text: `ZIEL ${PHYSICS.TEST_POWER_TARGET} MW — OZR NIEDRIG, WEITERE AUSFAHRT VERMEIDEN`, color: 'var(--warning-yellow)' };
    }
    if (xenonConcentration > PHYSICS.XENON_WARNING_CONCENTRATION) {
      return { text: `ZIEL ${PHYSICS.TEST_POWER_TARGET} MW — XENON HOCH, STABPOSITION BEOBACHTEN`, color: 'var(--warning-yellow)' };
    }
    return { text: `ZIEL ${PHYSICS.TEST_POWER_TARGET} MW — LEISTUNG STABIL — ZUSTAND HALTEN`, color: 'var(--safe-green)' };
  }

  const guidance = getGuidanceMessage();

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
          fontSize: '0.85rem',
          marginBottom: '6px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '4px',
        }}
      >
        STATUSANZEIGEN — HAUPTANZEIGE
      </div>

      {/* Zielanzeige und Operator-Guidance */}
      <div style={{
        border: '1px solid var(--border)',
        padding: '4px 6px',
        marginBottom: '4px',
        background: 'var(--bg)',
      }}>
        <div style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.6rem',
          color: '#666',
          marginBottom: '2px',
        }}>
          ZIEL: {PHYSICS.TEST_POWER_TARGET} MW (TOLERANZ +/-{PHYSICS.TEST_POWER_TOLERANCE} MW)
        </div>
        <div style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.65rem',
          color: guidance.color,
          lineHeight: 1.3,
        }}>
          {guidance.text}
        </div>
      </div>

      {/* Hauptanzeigen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
        <Display
          label="REAKTORLEISTUNG"
          value={`${thermalPower.toFixed(0)} MW`}
          color={getColorForPower(thermalPower)}
        />
        <Display
          label="XENON (% v. GLEICHGEW.)"
          value={formatXenonPercent(xenonConcentration)}
          color={getColorForXenon(xenonConcentration)}
        />
        <Display
          label="DAMPFDRUCK"
          value={`${steamPressure.toFixed(1)} bar`}
          color={getColorForPressure(steamPressure)}
        />
        <Display
          label="TESTZEIT"
          value={formatTime(elapsedSeconds)}
          color="var(--safe-green)"
          blink={isLastMinute}
        />
      </div>

      {/* Erweiterte Anzeigen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
        <Display
          label="KÜHLMITTEL"
          value={`${coolantTemperature.toFixed(0)}°C`}
          color={getColorForTemp(coolantTemperature, PHYSICS.COOLANT_TEMP_BOILING, PHYSICS.COOLANT_TEMP_BOILING + 20)}
          small
        />
        <Display
          label="BRENNSTOFF"
          value={`${fuelTemperature.toFixed(0)}°C`}
          color={getColorForTemp(fuelTemperature, PHYSICS.FUEL_TEMP_WARNING, PHYSICS.FUEL_TEMP_MELTDOWN * 0.8)}
          small
        />
        <Display
          label="NEUTRONENFL."
          value={`${(neutronFlux * 100).toFixed(1)}%`}
          color={neutronFlux > 0.8 ? 'var(--alarm-red)' : 'var(--amber)'}
          small
        />
        <Display
          label="KÜHLFLUSS"
          value={`${coolantFlowRate.toFixed(0)}`}
          color={coolantFlowRate < 3000 ? 'var(--alarm-red)' : coolantFlowRate < 5000 ? 'var(--warning-yellow)' : 'var(--amber)'}
          small
        />
        <Display
          label="DAMPFBLASEN"
          value={`${(steamVoidFraction * 100).toFixed(1)}%`}
          color={steamVoidFraction > 0.3 ? 'var(--alarm-red)' : steamVoidFraction > 0.1 ? 'var(--warning-yellow)' : 'var(--amber)'}
          small
        />
        <Display
          label="GENERATOR"
          value={`${generatorOutput.toFixed(0)} MW`}
          color="var(--amber)"
          small
        />
      </div>
    </div>
  );
}
