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
  it('renders correct MW display', () => {
    const { container } = render(
      <StatusDisplayPanel
        thermalPower={850}
        xenonConcentration={0.3}
        steamPressure={65}
        elapsedSeconds={120}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('shows red color for power above 1000 MW', () => {
    const { container } = render(
      <StatusDisplayPanel
        thermalPower={1500}
        xenonConcentration={0.3}
        steamPressure={65}
        elapsedSeconds={120}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
