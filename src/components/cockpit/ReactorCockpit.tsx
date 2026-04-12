'use client';

import { useReducer, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { gameReducer, INITIAL_STATE } from '@/lib/game/reducer';
import { PHYSICS } from '@/lib/physics/constants';
import ControlRodPanel from './ControlRodPanel';
import CoolantPumpPanel from './CoolantPumpPanel';
import EccsPanel from './EccsPanel';
import AZ5Button from './AZ5Button';
import LiveGraphPanel from './LiveGraphPanel';
import StatusDisplayPanel from './StatusDisplayPanel';
import EventLog from './EventLog';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ReactorCockpit() {
  const router = useRouter();
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [hasAlarm, setHasAlarm] = useState(false);

  // Start game immediately
  useEffect(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  // Game loop tick
  useEffect(() => {
    if (!state.isRunning || state.isExploded || state.testCompleted) return;

    const interval = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, PHYSICS.TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [state.isRunning, state.isExploded, state.testCompleted]);

  // Navigate to results on game end
  useEffect(() => {
    if (state.isExploded || state.testCompleted) {
      const timeout = setTimeout(() => {
        const params = new URLSearchParams({
          score: String(state.score),
          elapsed: String(state.elapsedSeconds),
          power: String(state.thermalPower.toFixed(0)),
          rods: String(state.controlRods),
          exploded: String(state.isExploded),
          completed: String(state.testCompleted),
        });
        router.push(`/results?${params.toString()}`);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [state.isExploded, state.testCompleted, state.score, state.elapsedSeconds, state.thermalPower, state.controlRods, router]);

  const handleAlarm = useCallback((alarm: boolean) => {
    setHasAlarm(alarm);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
      className={hasAlarm ? 'animate-border-flash' : ''}
    >
      {/* Header bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          fontSize: '0.8rem',
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--amber)' }}>
          T+{formatTime(state.elapsedSeconds)} / {formatTime(PHYSICS.TEST_DURATION_SECONDS)}
        </span>
        <span style={{ color: 'var(--amber)', fontSize: '0.9rem', letterSpacing: '3px' }}>
          REAKTOR 4 — TSCHERNOBYL
        </span>
        <span style={{ color: 'var(--safe-green)' }}>
          SCORE: {state.score}
        </span>
      </header>

      {/* Mobile warning */}
      <div
        style={{
          display: 'none',
          padding: '40px 20px',
          textAlign: 'center',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          color: 'var(--warning-yellow)',
        }}
        className="mobile-warning"
      >
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🖥</div>
        <div style={{ fontSize: '1.2rem' }}>REAKTORSTEUERUNG ERFORDERT DESKTOP-TERMINAL</div>
        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
          Minimale Auflösung: 1200px
        </div>
      </div>

      {/* 2x2 Grid */}
      <div
        className="cockpit-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          flex: 1,
          gap: '2px',
          padding: '2px',
          overflow: 'hidden',
        }}
      >
        {/* Top-left: Primary Controls */}
        <div style={{ overflow: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <ControlRodPanel controlRods={state.controlRods} dispatch={dispatch} />
          <CoolantPumpPanel pumpStates={state.pumpStates} dispatch={dispatch} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <EccsPanel eccsEnabled={state.eccsEnabled} dispatch={dispatch} />
            <AZ5Button az5Active={state.az5Active} dispatch={dispatch} />
          </div>
        </div>

        {/* Top-right: Live Graphs */}
        <div style={{ overflow: 'auto', padding: '8px' }}>
          <LiveGraphPanel
            neutronFlux={state.neutronFlux}
            coreTemperature={state.coreTemperatureZones[1]}
            steamPressure={state.steamPressure}
          />
        </div>

        {/* Bottom-left: Status Displays */}
        <div style={{ overflow: 'auto', padding: '8px' }}>
          <StatusDisplayPanel
            thermalPower={state.thermalPower}
            xenonConcentration={state.xenonConcentration}
            steamPressure={state.steamPressure}
            elapsedSeconds={state.elapsedSeconds}
          />
        </div>

        {/* Bottom-right: Event Log */}
        <div style={{ overflow: 'hidden', padding: '8px' }}>
          <EventLog events={state.events} onAlarm={handleAlarm} />
        </div>
      </div>

      {/* Explosion overlay */}
      {state.isExploded && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255, 32, 32, 0.15)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
          className="animate-pulse-alarm"
        >
          <div
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '3rem',
              color: 'var(--alarm-red)',
              textShadow: '0 0 30px var(--alarm-red)',
            }}
          >
            ☢ KERNSCHMELZE ☢
          </div>
        </div>
      )}

      {/* Test completed overlay */}
      {state.testCompleted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 255, 65, 0.08)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-share-tech-mono), monospace',
              fontSize: '2.5rem',
              color: 'var(--safe-green)',
              textShadow: '0 0 30px var(--safe-green)',
            }}
          >
            ✓ TEST ERFOLGREICH
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .cockpit-grid { display: none !important; }
          .mobile-warning { display: block !important; }
        }
      `}</style>
    </div>
  );
}
