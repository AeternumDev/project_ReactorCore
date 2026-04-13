import { buildAxisSpec } from '@/components/cockpit/LiveGraphPanel';

describe('buildAxisSpec', () => {
  it('creates a padded domain with unique ticks for flat values', () => {
    const axis = buildAxisSpec([95, 95, 95], {
      fallbackValue: 95,
      minimum: 0,
      minSpan: 24,
    });

    expect(axis.domain[1] - axis.domain[0]).toBeGreaterThanOrEqual(24);
    expect(new Set(axis.ticks).size).toBe(axis.ticks.length);
  });

  it('respects a minimum boundary without collapsing the span', () => {
    const axis = buildAxisSpec([4], {
      fallbackValue: 4,
      minimum: 0,
      minSpan: 20,
    });

    expect(axis.domain[0]).toBe(0);
    expect(axis.domain[1] - axis.domain[0]).toBeGreaterThanOrEqual(20);
    expect(new Set(axis.ticks).size).toBe(axis.ticks.length);
  });

  it('uses the fallback value when no history is available', () => {
    const axis = buildAxisSpec([], {
      fallbackValue: 650,
      minimum: 0,
      minSpan: 240,
    });

    expect(axis.domain[0]).toBeGreaterThanOrEqual(0);
    expect(axis.ticks).toHaveLength(5);
    expect(new Set(axis.ticks).size).toBe(axis.ticks.length);
  });
});