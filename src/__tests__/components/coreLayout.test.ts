import { CHANNELS, RODS, isInsideCore } from '@/components/cockpit/coreLayout';

function findChannel(row: number, col: number) {
  return CHANNELS.find(channel => channel.row === row && channel.col === col);
}

describe('coreLayout', () => {
  it('matches the image-derived RBMK channel counts', () => {
    expect(RODS).toHaveLength(211);
    expect(RODS.filter(rod => rod.type === 'AZ')).toHaveLength(24);
    expect(RODS.filter(rod => rod.type === 'AR')).toHaveLength(12);
    expect(RODS.filter(rod => rod.type === 'RR')).toHaveLength(143);
    expect(RODS.filter(rod => rod.type === 'LAR')).toHaveLength(0);
    expect(RODS.filter(rod => rod.type === 'USP')).toHaveLength(32);

    expect(CHANNELS).toHaveLength(1884);
    expect(CHANNELS.filter(channel => channel.channelType === 'fuel')).toHaveLength(1661);
    expect(CHANNELS.filter(channel => channel.channelType === 'rod')).toHaveLength(211);
    expect(CHANNELS.filter(channel => channel.channelType === 'sensor')).toHaveLength(12);
  });

  it('keeps the reference anchor positions intact', () => {
    expect(findChannel(7, 15)).toMatchObject({ channelType: 'sensor' });
    expect(findChannel(11, 23)).toMatchObject({ channelType: 'rod', rodType: 'AR' });
    expect(findChannel(3, 11)).toMatchObject({ channelType: 'rod', rodType: 'USP' });
    expect(findChannel(23, 23)).toMatchObject({ channelType: 'rod', rodType: 'AZ' });
    expect(findChannel(1, 17)).toMatchObject({ channelType: 'rod', rodType: 'RR' });
  });

  it('uses the recovered board outline instead of the old coarse circle', () => {
    expect(isInsideCore(0, 17)).toBe(true);
    expect(isInsideCore(0, 16)).toBe(false);
    expect(isInsideCore(47, 30)).toBe(true);
    expect(isInsideCore(47, 31)).toBe(false);
  });
});