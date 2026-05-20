import {
  advanceChecklistCompletion,
  buildChecklistProgress,
  POWER_HOLD_SECONDS,
  RUNDOWN_OBSERVATION_SECONDS,
  TestChecklistPanelProps,
} from '@/components/cockpit/TestChecklistPanel';
import { PHYSICS } from '@/lib/physics/constants';

describe('buildChecklistProgress', () => {
  const baseProps: TestChecklistPanelProps = {
    thermalPower: PHYSICS.TEST_POWER_TARGET,
    eccsEnabled: false,
    turbineConnected: true,
    turbineValveOpen: 80,
    turbineSpeed: 2900,
    bazArmed: false,
    elapsedSeconds: 120,
    testCompleted: false,
    isExploded: false,
    steamPressure: 65,
    coolantFlowRate: 7000,
    drumSeparatorLevel: 50,
    feedWaterFlow: 500,
    reactivityMargin: 40,
  };

  it('keeps later steps pending until earlier steps unlock them', () => {
    const completed = advanceChecklistCompletion(
      { ...baseProps, thermalPower: 1400 },
      { stablePowerSeconds: 0, rundownSeconds: 0 },
    );

    const checklist = buildChecklistProgress(
      { ...baseProps, thermalPower: 1400 },
      { stablePowerSeconds: 0, rundownSeconds: 0 },
      completed,
    );

    expect(checklist[0]).toMatchObject({ id: 'power-band', status: 'active', conditionMet: false });
    expect(checklist[6]).toMatchObject({ id: 'eccs-disconnect', status: 'pending', conditionMet: true });
    expect(checklist[7]).toMatchObject({ id: 'safety-override', status: 'pending', conditionMet: false });
  });

  it('moves from xenon slip into low-OZR recovery after the initial target was reached', () => {
    const completed = advanceChecklistCompletion(
      { ...baseProps, thermalPower: 600 },
      { stablePowerSeconds: 0, rundownSeconds: 0 },
      ['power-band'],
    );

    const checklist = buildChecklistProgress(
      { ...baseProps, thermalPower: 600 },
      { stablePowerSeconds: 0, rundownSeconds: 0 },
      completed,
    );

    expect(checklist[0]).toMatchObject({ id: 'power-band', status: 'completed', conditionMet: false });
    expect(checklist[1]).toMatchObject({ id: 'xenon-slip', status: 'completed', conditionMet: true });
    expect(checklist[2]).toMatchObject({ id: 'low-ozr-recovery', status: 'active', conditionMet: false });
  });

  it('holds the power stabilization step active until the full dwell time is met', () => {
    const completedIds = ['power-band', 'xenon-slip', 'low-ozr-recovery'];

    const checklist = buildChecklistProgress(
      { ...baseProps, reactivityMargin: 20 },
      { stablePowerSeconds: POWER_HOLD_SECONDS - 1, rundownSeconds: 0 },
      completedIds,
    );

    expect(checklist[3]).toMatchObject({ id: 'power-hold', status: 'active', conditionMet: false });
  });

  it('requires a real rundown observation before opening the final test-end step', () => {
    const preRundownCompleted = [
      'power-band',
      'xenon-slip',
      'low-ozr-recovery',
      'power-hold',
      'turbine-ready',
      'water-regime',
      'eccs-disconnect',
      'safety-override',
    ];

    const checklist = buildChecklistProgress(
      { ...baseProps, reactivityMargin: 20, turbineValveOpen: 0 },
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: RUNDOWN_OBSERVATION_SECONDS - 1 },
      preRundownCompleted,
    );

    expect(checklist[8]).toMatchObject({ id: 'begin-rundown', status: 'completed', conditionMet: true });
    expect(checklist[9]).toMatchObject({ id: 'observe-rundown', status: 'active', conditionMet: false });
    expect(checklist[10]).toMatchObject({ id: 'test-complete', status: 'pending', conditionMet: false });
  });

  it('unlocks the final step after a valid rundown and completes only when the test ends', () => {
    const preRundownCompleted = [
      'power-band',
      'xenon-slip',
      'low-ozr-recovery',
      'power-hold',
      'turbine-ready',
      'water-regime',
      'eccs-disconnect',
      'safety-override',
    ];

    const preCompletion = buildChecklistProgress(
      { ...baseProps, reactivityMargin: 20, turbineValveOpen: 0 },
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: RUNDOWN_OBSERVATION_SECONDS },
      preRundownCompleted,
    );

    expect(preCompletion[9]).toMatchObject({ id: 'observe-rundown', status: 'completed', conditionMet: true });
    expect(preCompletion[10]).toMatchObject({ id: 'test-complete', status: 'active', conditionMet: false });

    const beforeCompletionIds = advanceChecklistCompletion(
      { ...baseProps, reactivityMargin: 20, turbineValveOpen: 0 },
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: RUNDOWN_OBSERVATION_SECONDS },
      preRundownCompleted,
    );

    const completed = buildChecklistProgress(
      { ...baseProps, reactivityMargin: 20, turbineValveOpen: 0, testCompleted: true },
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: RUNDOWN_OBSERVATION_SECONDS },
      beforeCompletionIds,
    );

    expect(completed.every((item) => item.status === 'completed')).toBe(true);
  });
});