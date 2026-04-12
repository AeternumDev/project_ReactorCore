import React from 'react';
import { render } from '@testing-library/react';
import EventLog from '@/components/cockpit/EventLog';
import { GameEvent } from '@/lib/physics/types';

describe('EventLog', () => {
  it('renders events in correct order (newest first)', () => {
    const events: GameEvent[] = [
      { timestamp: 10, message: 'REAKTOR GESTARTET', severity: 'info' },
      { timestamp: 30, message: 'XENON-VERGIFTUNG ERHÖHT', severity: 'warning' },
      { timestamp: 60, message: 'BRENNSTOFFTEMPERATUR KRITISCH', severity: 'critical' },
      { timestamp: 90, message: 'KERNSCHMELZE — REAKTOR 4 EXPLODIERT', severity: 'alarm' },
    ];

    const { container } = render(<EventLog events={events} />);
    expect(container).toMatchSnapshot();
  });

  it('renders empty state', () => {
    const { container } = render(<EventLog events={[]} />);
    expect(container).toMatchSnapshot();
  });
});
