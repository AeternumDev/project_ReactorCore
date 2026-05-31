import { CHANNELS, ChannelInfo } from '@/components/cockpit/coreLayout';
import { getMnemonicChannelHeatColor } from '@/components/cockpit/MnemonicBoard';
import { PHYSICS } from '@/lib/physics/constants';

describe('MnemonicBoard heat display', () => {
  const centralFuelChannel: ChannelInfo = {
    row: 24,
    col: 24,
    channelType: 'fuel',
    id: 'test-center',
    quadrant: 'SE',
  };

  it('keeps real heat colors visible after the explosion state is latched', () => {
    const fuelChannel = CHANNELS.find((channel) => channel.channelType === 'fuel');

    expect(fuelChannel).toBeDefined();
    expect(
      getMnemonicChannelHeatColor(
        fuelChannel!,
        [
          PHYSICS.FUEL_TEMP_MELTDOWN,
          PHYSICS.FUEL_TEMP_MELTDOWN,
          PHYSICS.FUEL_TEMP_MELTDOWN,
          PHYSICS.FUEL_TEMP_MELTDOWN,
        ],
      ),
    ).not.toBe('#331100');
  });

  it('does not saturate to full red at the first fuel-temperature warning threshold', () => {
    expect(
      getMnemonicChannelHeatColor(
        centralFuelChannel,
        [
          PHYSICS.FUEL_TEMP_WARNING,
          PHYSICS.FUEL_TEMP_WARNING,
          PHYSICS.FUEL_TEMP_WARNING,
          PHYSICS.FUEL_TEMP_WARNING,
        ],
      ),
    ).not.toBe('#ff1111');
  });

  it('reaches full red only once the calculated heat is beyond meltdown scale', () => {
    const beyondMeltdown = PHYSICS.FUEL_TEMP_MELTDOWN * 1.2;

    expect(
      getMnemonicChannelHeatColor(
        centralFuelChannel,
        [beyondMeltdown, beyondMeltdown, beyondMeltdown, beyondMeltdown],
      ),
    ).toBe('#ff1111');
  });
});