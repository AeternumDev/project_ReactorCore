import React from 'react';
import { render, screen } from '@testing-library/react';
import AZ5Button from '@/components/cockpit/AZ5Button';
import { PHYSICS } from '@/lib/physics/constants';

describe('AZ5Button', () => {
  it('hides the stalled-reactor AZ-5 prompt after AZ-5 has already been triggered', () => {
    render(
      <AZ5Button
        az5Triggered
        thermalPower={PHYSICS.XENON_STALL_POWER}
        reactivityMargin={8}
        dispatch={jest.fn()}
      />,
    );

    expect(screen.queryByText(/VORSCHRIFT: AZ-5 AUSLÖSEN/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AZ-5 AUSGELÖST/ })).toBeDisabled();
  });
});