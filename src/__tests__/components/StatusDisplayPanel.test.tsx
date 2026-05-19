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

  it('renders the historical 200 MW target and equilibrium xenon display', () => {
    renderPanel();

    expect(screen.getByText('ZIEL: 200 MW (TOLERANZ +/-50 MW)')).toBeInTheDocument();
    expect(screen.getByText('200 MW')).toHaveStyle({ color: 'var(--safe-green)' });
    expect(screen.getByText('100%')).toHaveStyle({ color: 'var(--amber)' });
    expect(screen.getByText('ZIEL 200 MW — LEISTUNG STABIL — ZUSTAND HALTEN')).toHaveStyle({
      color: 'var(--safe-green)',
    });
  });

  it('warns when power is below the historical hold window', () => {
    renderPanel({ thermalPower: 125 });

    expect(screen.getByText('125 MW')).toHaveStyle({ color: 'var(--warning-yellow)' });
    expect(screen.getByText('LEISTUNG UNTER 200 MW — MR-STÄBE VORSICHTIG AUSFAHREN')).toHaveStyle({
      color: 'var(--warning-yellow)',
    });
  });

  it('warns when power exceeds the historical hold window', () => {
    renderPanel({ thermalPower: 300 });

    expect(screen.getByText('300 MW')).toHaveStyle({ color: 'var(--warning-yellow)' });
    expect(screen.getByText('LEISTUNG ÜBER 200 MW — MR-STÄBE EINFAHREN')).toHaveStyle({
      color: 'var(--warning-yellow)',
    });
  });

  it('uses shared xenon thresholds for pit warning colors', () => {
    renderPanel({ xenonConcentration: PHYSICS.XENON_WARNING_CONCENTRATION + 0.01 });

    expect(screen.getByText('136%')).toHaveStyle({ color: 'var(--warning-yellow)' });
    expect(screen.getByText('ZIEL 200 MW — XENON HOCH, STABPOSITION BEOBACHTEN')).toHaveStyle({
      color: 'var(--warning-yellow)',
    });
  });

  it('marks the clock as blinking in the final minute', () => {
    renderPanel({ elapsedSeconds: PHYSICS.TEST_DURATION_SECONDS - 30 });

    expect(screen.getByText('07:30')).toHaveClass('animate-blink');
  });

  it('shows the AZ-5 procedure warning when the reactor is stalled', () => {
    renderPanel({ thermalPower: PHYSICS.XENON_STALL_POWER });

    expect(screen.getByText('REAKTOR GESTALLT — VORSCHRIFT ERWARTET AZ-5')).toHaveStyle({
      color: 'var(--alarm-red)',
    });
  });
});
