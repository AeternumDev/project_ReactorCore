import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusDisplayPanel from '@/components/cockpit/StatusDisplayPanel';
import { PHYSICS } from '@/lib/physics/constants';

// Mock CSS variables for JSDOM
beforeAll(() => {
  document.documentElement.style.setProperty('--amber', '#FF8C00');
  document.documentElement.style.setProperty('--alarm-red', '#FF2020');
  document.documentElement.style.setProperty('--safe-green', '#00FF41');
  document.documentElement.style.setProperty('--warning-yellow', '#FFD700');
  document.documentElement.style.setProperty('--bg', '#080808');
  document.documentElement.style.setProperty('--surface', '#111111');
  document.documentElement.style.setProperty('--border', '#2a2a2a');
});

describe('StatusDisplayPanel', () => {
  const baseProps = {
    thermalPower: PHYSICS.TEST_POWER_TARGET,
    xenonConcentration: PHYSICS.XENON_EQUILIBRIUM_CONCENTRATION,
    steamPressure: 65,
    elapsedSeconds: 120,
    coolantTemperature: 270,
    fuelTemperature: 650,
    coolantFlowRate: 45000,
    steamVoidFraction: 0.1,
    neutronFlux: 0.06,
    generatorOutput: 180,
    reactivityMargin: 40,
    controlRods: 50,
    manualRods: 26,
  };

  function renderPanel(overrides: Partial<typeof baseProps> = {}) {
    render(<StatusDisplayPanel {...baseProps} {...overrides} />);
  }

  it('renders the historical 700 MW target and equilibrium xenon display', () => {
    renderPanel();

    expect(screen.getByText('ZIEL: 700 MW (TOLERANZ +/-50 MW)')).toBeInTheDocument();
    expect(screen.getByText('700 MW')).toHaveStyle({ color: 'var(--safe-green)' });
    expect(screen.getByText('100%')).toHaveStyle({ color: 'var(--amber)' });
    expect(screen.getByText('ZIEL 700 MW — LEISTUNG STABIL — ZUSTAND HALTEN')).toHaveStyle({
      color: 'var(--safe-green)',
    });
  });

  it('warns when power is below the 700 MW hold window', () => {
    renderPanel({ thermalPower: 500 });

    expect(screen.getByText('500 MW')).toHaveStyle({ color: 'var(--warning-yellow)' });
    expect(screen.getByText('LEISTUNG UNTER 700 MW — MR-STÄBE AUSFAHREN')).toHaveStyle({
      color: 'var(--warning-yellow)',
    });
  });

  it('warns when power exceeds the 700 MW hold window', () => {
    renderPanel({ thermalPower: 800 });

    expect(screen.getByText('800 MW')).toHaveStyle({ color: 'var(--warning-yellow)' });
    expect(screen.getByText('LEISTUNG ÜBER 700 MW — MR-STÄBE EINFAHREN')).toHaveStyle({
      color: 'var(--warning-yellow)',
    });
  });

  it('uses shared xenon thresholds for pit warning colors', () => {
    renderPanel({ xenonConcentration: PHYSICS.XENON_WARNING_CONCENTRATION + 0.01 });

    expect(screen.getByText('151%')).toHaveStyle({ color: 'var(--warning-yellow)' });
    expect(screen.getByText('ZIEL 700 MW — XENON-PIT → STABPOSITION BEOBACHTEN')).toHaveStyle({
      color: 'var(--safe-green)',
    });
  });

  it('marks the clock as blinking in the final minute', () => {
    renderPanel({ elapsedSeconds: PHYSICS.TEST_DURATION_SECONDS - 30 });

    expect(screen.getByText('07:30')).toHaveClass('animate-blink');
  });
});
