'use client';

import { useEffect, useRef } from 'react';
import { PHYSICS } from '@/lib/physics/constants';

export interface TestChecklistPanelProps {
  thermalPower: number;
  eccsEnabled: boolean;
  turbineConnected: boolean;
  turbineValveOpen: number;
  turbineSpeed: number;
  bazArmed: boolean;
  elapsedSeconds: number;
  testCompleted: boolean;
  isExploded: boolean;
  steamPressure: number;
  coolantFlowRate: number;
  drumSeparatorLevel: number;
  feedWaterFlow: number;
  reactivityMargin: number;
}

interface ChecklistContext extends TestChecklistPanelProps {
  stablePowerSeconds: number;
  rundownSeconds: number;
}

interface ChecklistItem {
  id: string;
  step: string;
  title: string;
  instruction: string;
  check: (context: ChecklistContext) => boolean;
}

export interface ChecklistStatus extends ChecklistItem {
  conditionMet: boolean;
  status: 'completed' | 'active' | 'pending';
}

export const POWER_HOLD_SECONDS = 60;
export const RUNDOWN_OBSERVATION_SECONDS = 15;

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'power-band',
    step: '01',
    title: 'LEISTUNG IN DEN VERSUCHSBEREICH BRINGEN',
    instruction: `Reaktorleistung auf ${PHYSICS.TEST_POWER_MIN}–${PHYSICS.TEST_POWER_MAX} MW(th) absenken.`,
    check: (context) => (
      context.thermalPower >= PHYSICS.TEST_POWER_MIN &&
      context.thermalPower <= PHYSICS.TEST_POWER_MAX
    ),
  },
  {
    id: 'power-hold',
    step: '02',
    title: 'LEISTUNG STABIL HALTEN',
    instruction: `Leistung ${POWER_HOLD_SECONDS} Sekunden durchgehend im Bereich ${PHYSICS.TEST_POWER_MIN}–${PHYSICS.TEST_POWER_MAX} MW(th) halten.`,
    check: (context) => context.stablePowerSeconds >= POWER_HOLD_SECONDS,
  },
  {
    id: 'turbine-ready',
    step: '03',
    title: 'TG-8 AUF DAMPF HALTEN',
    instruction: 'Turbogenerator Nr. 8 gekoppelt lassen, Dampfventil mindestens 60 % offen halten und Drehzahl von mindestens 2800 U/min sicherstellen.',
    check: (context) => (
      context.turbineConnected &&
      context.turbineValveOpen >= 60 &&
      context.turbineSpeed >= 2800
    ),
  },
  {
    id: 'water-regime',
    step: '04',
    title: 'WASSER- UND KÜHLREGIME SICHERN',
    instruction: 'Speisewasser im Bereich 350–650 L/s, Trommelabscheider bei 35–65 % und Kühlmitteldurchfluss oberhalb von 5600 L/s halten.',
    check: (context) => (
      context.feedWaterFlow >= 350 &&
      context.feedWaterFlow <= 650 &&
      context.drumSeparatorLevel >= 35 &&
      context.drumSeparatorLevel <= 65 &&
      context.coolantFlowRate >= PHYSICS.COOLANT_FLOW_NOMINAL * 0.8 &&
      context.steamPressure <= PHYSICS.STEAM_PRESSURE_WARNING
    ),
  },
  {
    id: 'eccs-disconnect',
    step: '05',
    title: 'ECCS FÜR DEN VERSUCH ABGESCHALTET',
    instruction: 'Notkernkühlsystem (ECCS) für den Auslauftest abgeschaltet lassen.',
    check: (context) => !context.eccsEnabled,
  },
  {
    id: 'safety-override',
    step: '06',
    title: 'SCHUTZBLOCKIERUNG UND OZR PRÜFEN',
    instruction: `BAZ-Blockierung bestätigt und OZR mindestens ${PHYSICS.OZR_WARNING} Stabäquivalente vor Versuchsbeginn halten.`,
    check: (context) => !context.bazArmed && context.reactivityMargin >= PHYSICS.OZR_WARNING,
  },
  {
    id: 'begin-rundown',
    step: '07',
    title: 'DAMPF ZU TG-8 ABSPERREN',
    instruction: 'Dampfzufuhr zum Turbogenerator Nr. 8 vollständig schließen und den Auslauf einleiten.',
    check: (context) => context.turbineConnected && context.turbineValveOpen === 0,
  },
  {
    id: 'observe-rundown',
    step: '08',
    title: 'AUSLAUF KONTROLLIERT BEOBACHTEN',
    instruction: `Auslauf mindestens ${RUNDOWN_OBSERVATION_SECONDS} Sekunden beobachten und dabei Leistung unter ${PHYSICS.TEST_POWER_MAX} MW(th) sowie Kühlfluss oberhalb von ${PHYSICS.BAZ_COOLANT_FLOW_MIN} L/s halten.`,
    check: (context) => (
      context.rundownSeconds >= RUNDOWN_OBSERVATION_SECONDS &&
      context.thermalPower <= PHYSICS.TEST_POWER_MAX &&
      context.coolantFlowRate >= PHYSICS.BAZ_COOLANT_FLOW_MIN &&
      !context.isExploded
    ),
  },
  {
    id: 'test-complete',
    step: '09',
    title: 'MESSREIHE BIS ZUM TESTENDE FORTFÜHREN',
    instruction: 'Generatorauslauf weiter überwachen, Protokoll abschließen und Reaktor bis zum offiziellen Testende beherrschen.',
    check: (context) => context.testCompleted && !context.isExploded,
  },
];

export function buildChecklistProgress(
  props: TestChecklistPanelProps,
  timing: Pick<ChecklistContext, 'stablePowerSeconds' | 'rundownSeconds'>,
  completedIds: string[] = [],
): ChecklistStatus[] {
  const context: ChecklistContext = { ...props, ...timing };
  const completedSet = new Set(completedIds);
  let locked = false;

  return CHECKLIST.map((item) => {
    const conditionMet = item.check(context);

    if (completedSet.has(item.id)) {
      return { ...item, conditionMet, status: 'completed' };
    }

    if (locked) {
      return { ...item, conditionMet, status: 'pending' };
    }

    if (conditionMet) {
      return { ...item, conditionMet, status: 'completed' };
    }

    locked = true;
    return { ...item, conditionMet, status: 'active' };
  });
}

export function advanceChecklistCompletion(
  props: TestChecklistPanelProps,
  timing: Pick<ChecklistContext, 'stablePowerSeconds' | 'rundownSeconds'>,
  completedIds: string[] = [],
): string[] {
  const context: ChecklistContext = { ...props, ...timing };
  const nextCompleted = new Set(completedIds);

  for (const [index, item] of CHECKLIST.entries()) {
    const prerequisitesMet = CHECKLIST
      .slice(0, index)
      .every((previous) => nextCompleted.has(previous.id));

    if (!prerequisitesMet) break;
    if (nextCompleted.has(item.id)) continue;
    if (!item.check(context)) break;

    nextCompleted.add(item.id);
  }

  return CHECKLIST.filter((item) => nextCompleted.has(item.id)).map((item) => item.id);
}

export default function TestChecklistPanel(props: TestChecklistPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const checklistProgressRef = useRef<{
    lastElapsed: number;
    powerBandEnteredAt: number | null;
    rundownStartedAt: number | null;
    completedStepIds: string[];
  }>({
    lastElapsed: 0,
    powerBandEnteredAt: null,
    rundownStartedAt: null,
    completedStepIds: [],
  });

  const powerInBand = props.thermalPower >= PHYSICS.TEST_POWER_MIN && props.thermalPower <= PHYSICS.TEST_POWER_MAX;
  const rundownActive = props.turbineConnected && props.turbineValveOpen === 0;
  const progressState = checklistProgressRef.current;

  if (props.elapsedSeconds < progressState.lastElapsed) {
    progressState.powerBandEnteredAt = null;
    progressState.rundownStartedAt = null;
    progressState.completedStepIds = [];
  }

  if (powerInBand) {
    progressState.powerBandEnteredAt ??= props.elapsedSeconds;
  } else {
    progressState.powerBandEnteredAt = null;
  }

  if (rundownActive) {
    progressState.rundownStartedAt ??= props.elapsedSeconds;
  } else {
    progressState.rundownStartedAt = null;
  }

  const stablePowerSeconds = powerInBand && progressState.powerBandEnteredAt !== null
    ? Math.max(0, props.elapsedSeconds - progressState.powerBandEnteredAt)
    : 0;
  const rundownSeconds = rundownActive && progressState.rundownStartedAt !== null
    ? Math.max(0, props.elapsedSeconds - progressState.rundownStartedAt)
    : 0;

  progressState.completedStepIds = advanceChecklistCompletion(
    props,
    { stablePowerSeconds, rundownSeconds },
    progressState.completedStepIds,
  );
  progressState.lastElapsed = props.elapsedSeconds;

  const checklist = buildChecklistProgress(
    props,
    { stablePowerSeconds, rundownSeconds },
    progressState.completedStepIds,
  );

  const activeStep = checklist.find((item) => item.status === 'active')?.id ?? null;
  const completedCount = checklist.filter((item) => item.status === 'completed').length;

  // Auto-scroll to active step
  useEffect(() => {
    if (activeStep && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-step="${activeStep}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeStep]);

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '12px',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.98rem',
          marginBottom: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '6px',
        }}
      >
        TESTPROGRAMM — TURBOGENERATOR NR. 8
      </div>

      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: '#555',
          fontSize: '0.78rem',
          marginBottom: '8px',
          lineHeight: '1.5',
        }}
      >
        PROGRAMM ZUR PRÜFUNG DES AUSLAUFVERHALTENS DES TURBOGENERATORS MIT
        EIGENBEDARFSVERSORGUNG DER KKW-AGGREGATE
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          marginBottom: '8px',
          fontFamily: 'var(--font-share-tech-mono), monospace',
        }}
      >
        <div
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            padding: '6px 8px',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: '#666', marginBottom: '2px' }}>LEISTUNG HALTEN</div>
          <div style={{ fontSize: '0.92rem', color: stablePowerSeconds >= POWER_HOLD_SECONDS ? 'var(--safe-green)' : 'var(--warning-yellow)' }}>
            {Math.min(stablePowerSeconds, POWER_HOLD_SECONDS).toFixed(0)} / {POWER_HOLD_SECONDS} s
          </div>
        </div>
        <div
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            padding: '6px 8px',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: '#666', marginBottom: '2px' }}>AUSLAUF</div>
          <div style={{ fontSize: '0.92rem', color: rundownSeconds >= RUNDOWN_OBSERVATION_SECONDS ? 'var(--safe-green)' : 'var(--amber)' }}>
            {Math.min(rundownSeconds, RUNDOWN_OBSERVATION_SECONDS).toFixed(0)} / {RUNDOWN_OBSERVATION_SECONDS} s
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.86rem',
          lineHeight: '1.55',
          paddingRight: '2px',
        }}
      >
        {checklist.map((item) => {
          const completed = item.status === 'completed';
          const isActive = item.status === 'active';

          return (
            <div
              key={item.id}
              data-step={item.id}
              style={{
                padding: '8px 10px',
                marginBottom: '6px',
                border: `1px solid ${
                  completed ? 'var(--safe-green)' :
                  isActive ? 'var(--warning-yellow)' :
                  'var(--border)'
                }`,
                background: isActive ? 'rgba(255, 200, 0, 0.03)' : 'transparent',
                opacity: completed ? 0.72 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '4px' }}>
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${completed ? 'var(--safe-green)' : '#444'}`,
                    color: completed ? 'var(--safe-green)' : '#444',
                    fontSize: '0.78rem',
                    flexShrink: 0,
                  }}
                >
                  {completed ? '✓' : item.step}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: completed ? 'var(--safe-green)' :
                        isActive ? 'var(--warning-yellow)' :
                        '#888',
                      fontSize: '0.72rem',
                      letterSpacing: '0.06em',
                      marginBottom: '2px',
                    }}
                  >
                    SCHRITT {item.step} · {completed ? 'ABGESCHLOSSEN' : isActive ? 'AKTIV' : 'AUSSTEHEND'}
                  </div>
                  <div
                    style={{
                      color: completed ? '#8fbe8f' : isActive ? 'var(--text)' : '#b0b0b0',
                      fontSize: '0.88rem',
                      fontWeight: 'bold',
                      textDecoration: completed ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </div>
                </div>
              </div>
              <div
                style={{
                  color: completed ? '#555' :
                    isActive ? 'var(--text)' :
                    '#666',
                  paddingLeft: '34px',
                  fontSize: '0.8rem',
                }}
              >
                {item.instruction}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer status */}
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.78rem',
          color: '#555',
          borderTop: '1px solid var(--border)',
          paddingTop: '6px',
          marginTop: '8px',
        }}
      >
        {completedCount}/{CHECKLIST.length} SCHRITTE IN REIHENFOLGE ABGESCHLOSSEN
      </div>
    </div>
  );
}
