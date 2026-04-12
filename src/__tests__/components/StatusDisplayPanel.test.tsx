import React from 'react';
import { render } from '@testing-library/react';
import StatusDisplayPanel from '@/components/cockpit/StatusDisplayPanel';

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
    thermalPower: 200,
    xenonConcentration: 0.3,
    steamPressure: 65,
    elapsedSeconds: 120,
    coolantTemperature: 270,
    fuelTemperature: 650,
    coolantFlowRate: 45000,
    steamVoidFraction: 0.1,
    neutronFlux: 0.06,
    generatorOutput: 180,
    reactivityMargin: 26,
    controlRods: 50,
    manualRods: 26,
  };

  it('renders correct MW display', () => {
    const { container } = render(
      <StatusDisplayPanel {...baseProps} />
    );
    expect(container).toMatchSnapshot();
  });

  it('shows warning color for power above 250 MW', () => {
    const { container } = render(
      <StatusDisplayPanel {...baseProps} thermalPower={400} />
    );
    expect(container).toMatchSnapshot();
  });

  it('shows green for power within 150-250 MW band', () => {
    const { container } = render(
      <StatusDisplayPanel {...baseProps} thermalPower={200} />
    );
    expect(container).toMatchSnapshot();
  });
});
