'use client';

import { useEffect, useRef, useState } from 'react';

interface TestChecklistPanelProps {
  thermalPower: number;
  eccsEnabled: boolean;
  turbineConnected: boolean;
  turbineValveOpen: number;
  turbineSpeed: number;
  bazArmed: boolean;
  elapsedSeconds: number;
  testCompleted: boolean;
  isExploded: boolean;
}

interface ChecklistItem {
  id: string;
  step: string;
  instruction: string;
  check: (props: TestChecklistPanelProps) => boolean;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'power-reduction',
    step: '01',
    instruction: 'Leistung des Reaktors auf 700–1000 MW(th) reduzieren. Stabilisierung im vorgegebenen Leistungsband sicherstellen.',
    check: (p) => p.thermalPower >= 700 && p.thermalPower <= 1000,
  },
  {
    id: 'eccs-disconnect',
    step: '02',
    instruction: 'Notkernkühlsystem (ECCS/САОЗ) abschalten, um Fehlauslösung während des Experiments zu verhindern.',
    check: (p) => !p.eccsEnabled,
  },
  {
    id: 'baz-block',
    step: '03',
    instruction: 'Schutzabschaltungssignale für Reaktornotabschaltung (BAZ) bei thermischen Parametern blockieren.',
    check: (p) => !p.bazArmed,
  },
  {
    id: 'turbine-ready',
    step: '04',
    instruction: 'Turbogenerator Nr. 8 an Reaktordampfversorgung angeschlossen. Dampfventil geöffnet. Turbinendrehzahl prüfen (Soll: ≥2800 U/min).',
    check: (p) => p.turbineConnected && p.turbineValveOpen > 50 && p.turbineSpeed >= 2800,
  },
  {
    id: 'power-stable',
    step: '05',
    instruction: 'Reaktorleistung im Bereich 700–1000 MW(th) stabilisieren. Leistung mindestens 60 Sekunden im Zielband halten.',
    check: (p) => p.thermalPower >= 700 && p.thermalPower <= 1000 && p.elapsedSeconds >= 60,
  },
  {
    id: 'begin-test',
    step: '06',
    instruction: 'Dampfzufuhr zum Turbogenerator Nr. 8 absperren. Auslaufverhalten des Generators messen. Überwachung der Eigenbedarfsversorgung.',
    check: (p) => p.turbineValveOpen === 0,
  },
  {
    id: 'monitor-rundown',
    step: '07',
    instruction: 'Während des Turbinenauslaufs: Kühlmitteldurchfluss und Reaktorparameter kontinuierlich überwachen. Leistung darf 1000 MW(th) nicht überschreiten.',
    check: (p) => p.turbineValveOpen === 0 && p.thermalPower <= 1000,
  },
  {
    id: 'test-complete',
    step: '08',
    instruction: 'Nach Abschluss der Messung: Reaktor in sicheren Zustand überführen. Alle Systeme prüfen. Protokoll abschließen.',
    check: (p) => p.testCompleted,
  },
];

export default function TestChecklistPanel(props: TestChecklistPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  // Find the first incomplete step
  useEffect(() => {
    const firstIncomplete = CHECKLIST.find(item => !item.check(props));
    setActiveStep(firstIncomplete?.id ?? null);
  }, [props]);

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
        maxHeight: '300px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--amber)',
          fontSize: '0.9rem',
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
          fontSize: '0.65rem',
          marginBottom: '8px',
          lineHeight: '1.4',
        }}
      >
        PROGRAMM ZUR PRÜFUNG DES AUSLAUFVERHALTENS DES TURBOGENERATORS MIT
        EIGENBEDARFSVERSORGUNG DER KKW-AGGREGATE
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.75rem',
          lineHeight: '1.5',
        }}
      >
        {CHECKLIST.map((item) => {
          const completed = item.check(props);
          const isActive = item.id === activeStep;

          return (
            <div
              key={item.id}
              data-step={item.id}
              style={{
                padding: '6px 8px',
                marginBottom: '4px',
                border: `1px solid ${
                  completed ? 'var(--safe-green)' :
                  isActive ? 'var(--warning-yellow)' :
                  'var(--border)'
                }`,
                background: isActive ? 'rgba(255, 200, 0, 0.03)' : 'transparent',
                opacity: completed ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${completed ? 'var(--safe-green)' : '#444'}`,
                    color: completed ? 'var(--safe-green)' : '#444',
                    fontSize: '0.7rem',
                    flexShrink: 0,
                  }}
                >
                  {completed ? '✓' : item.step}
                </span>
                <span
                  style={{
                    color: completed ? 'var(--safe-green)' :
                      isActive ? 'var(--warning-yellow)' :
                      '#666',
                    fontSize: '0.7rem',
                    textDecoration: completed ? 'line-through' : 'none',
                  }}
                >
                  SCHRITT {item.step}
                </span>
              </div>
              <div
                style={{
                  color: completed ? '#555' :
                    isActive ? 'var(--text)' :
                    '#555',
                  paddingLeft: '28px',
                  fontSize: '0.7rem',
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
          fontSize: '0.7rem',
          color: '#555',
          borderTop: '1px solid var(--border)',
          paddingTop: '6px',
          marginTop: '8px',
        }}
      >
        {CHECKLIST.filter(item => item.check(props)).length}/{CHECKLIST.length} SCHRITTE ABGESCHLOSSEN
      </div>
    </div>
  );
}
