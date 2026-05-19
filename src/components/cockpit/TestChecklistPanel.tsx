'use client';

import { useRef } from 'react';
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
    title: 'NIEDRIGLEISTUNGS-ZUSTAND BESTÄTIGEN',
    instruction: `Reaktorleistung im historischen Bereich um ${PHYSICS.TEST_POWER_TARGET} MW(th) halten.`,
    check: (context) => (
      context.thermalPower >= PHYSICS.TEST_POWER_MIN &&
      context.thermalPower <= PHYSICS.TEST_POWER_MAX
    ),
  },
  {
    id: 'power-hold',
    step: '02',
    title: 'LEISTUNG STABIL HALTEN',
    instruction: `Leistung ${POWER_HOLD_SECONDS} Sekunden durchgehend nahe ${PHYSICS.TEST_POWER_TARGET} MW(th) halten; keine grossen Stabspruenge.`,
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
    instruction: `BAZ-Blockierung bestätigt; OZR muss oberhalb ${PHYSICS.OZR_MINIMUM_SAFE} Stabäquivalente bleiben, unter ${PHYSICS.OZR_WARNING} ist bereits Warnbereich.`,
    check: (context) => !context.bazArmed && context.reactivityMargin >= PHYSICS.OZR_MINIMUM_SAFE,
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
    instruction: `Auslauf mindestens ${RUNDOWN_OBSERVATION_SECONDS} Sekunden beobachten und dabei Leistung nahe ${PHYSICS.TEST_POWER_TARGET} MW(th) sowie Kühlfluss oberhalb von ${PHYSICS.BAZ_COOLANT_FLOW_MIN} L/s halten.`,
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

  const activeStep = checklist.find((item) => item.status === 'active') ?? null;
  const completedSteps = checklist.filter((item) => item.status === 'completed');
  const pendingSteps = checklist.filter((item) => item.status === 'pending');
  const completedCount = completedSteps.length;
  const totalSteps = checklist.length;
  const progressPercent = (completedCount / totalSteps) * 100;
  const allDone = completedCount === totalSteps;

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

      {/* Progress bar */}
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: '#666',
            marginBottom: '3px',
          }}
        >
          <span>FORTSCHRITT</span>
          <span style={{ color: allDone ? 'var(--safe-green)' : 'var(--amber)' }}>
            {completedCount} / {totalSteps}
          </span>
        </div>
        <div
          style={{
            height: '6px',
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${progressPercent}%`,
              background: allDone
                ? 'linear-gradient(90deg, var(--safe-green), #5fbf6f)'
                : 'linear-gradient(90deg, var(--amber), #d49500)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* HERO: current step / completion banner */}
      {allDone ? (
        <div
          data-testid="checklist-complete-banner"
          style={{
            border: '1px solid var(--safe-green)',
            background: 'rgba(95, 191, 111, 0.06)',
            padding: '12px',
            marginBottom: '10px',
            fontFamily: 'var(--font-share-tech-mono), monospace',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--safe-green)',
              letterSpacing: '0.1em',
              marginBottom: '4px',
            }}
          >
            ✓ ALLE SCHRITTE ABGESCHLOSSEN
          </div>
          <div style={{ fontSize: '0.88rem', color: '#cfeacd' }}>
            Programm vollständig abgearbeitet — Reaktor weiter beherrschen.
          </div>
        </div>
      ) : activeStep ? (
        <div
          data-testid="checklist-active-step"
          data-step={activeStep.id}
          style={{
            border: '2px solid var(--warning-yellow)',
            background: 'rgba(255, 200, 0, 0.05)',
            padding: '10px 12px',
            marginBottom: '10px',
            fontFamily: 'var(--font-share-tech-mono), monospace',
            boxShadow: '0 0 0 1px rgba(255, 200, 0, 0.15) inset',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                color: 'var(--warning-yellow)',
                letterSpacing: '0.12em',
              }}
            >
              ► JETZT TUN · SCHRITT {activeStep.step} VON {totalSteps}
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#666',
              }}
            >
              {completedCount} ERLEDIGT
            </span>
          </div>
          <div
            style={{
              color: 'var(--text)',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              marginBottom: '6px',
              letterSpacing: '0.02em',
            }}
          >
            {activeStep.title}
          </div>
          <div
            style={{
              color: '#bdbdbd',
              fontSize: '0.8rem',
              lineHeight: 1.5,
            }}
          >
            {activeStep.instruction}
          </div>
        </div>
      ) : null}

      {/* Step list — completed (collapsed) + pending (compact) */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.78rem',
          paddingRight: '2px',
        }}
      >
        {completedSteps.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                fontSize: '0.62rem',
                color: '#555',
                letterSpacing: '0.1em',
                padding: '0 2px 4px',
                borderBottom: '1px solid #1a1a1a',
                marginBottom: '4px',
              }}
            >
              ABGESCHLOSSEN ({completedSteps.length})
            </div>
            {completedSteps.map((item) => (
              <div
                key={item.id}
                data-step={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '3px 4px',
                  color: '#6a8a6a',
                  fontSize: '0.74rem',
                  lineHeight: 1.3,
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--safe-green)',
                    color: 'var(--safe-green)',
                    fontSize: '0.7rem',
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                <span style={{ color: '#5a7a5a', minWidth: '20px' }}>{item.step}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {pendingSteps.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '0.62rem',
                color: '#555',
                letterSpacing: '0.1em',
                padding: '0 2px 4px',
                borderBottom: '1px solid #1a1a1a',
                marginBottom: '4px',
              }}
            >
              AUSSTEHEND ({pendingSteps.length})
            </div>
            {pendingSteps.map((item) => (
              <div
                key={item.id}
                data-step={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '3px 4px',
                  color: '#777',
                  fontSize: '0.74rem',
                  lineHeight: 1.3,
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #333',
                    color: '#555',
                    fontSize: '0.7rem',
                    flexShrink: 0,
                  }}
                >
                  {item.step}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer status */}
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.72rem',
          color: '#555',
          borderTop: '1px solid var(--border)',
          paddingTop: '6px',
          marginTop: '8px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{completedCount}/{totalSteps} SCHRITTE</span>
        <span style={{ color: allDone ? 'var(--safe-green)' : '#666' }}>
          {allDone ? 'PROGRAMM KOMPLETT' : activeStep ? `► ${activeStep.step} AKTIV` : '— WARTEN —'}
        </span>
      </div>
    </div>
  );
}
