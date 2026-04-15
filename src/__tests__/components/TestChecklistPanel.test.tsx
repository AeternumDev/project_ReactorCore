import {
  advanceChecklistCompletion,
  buildChecklistProgress,
  POWER_HOLD_SECONDS,
  RUNDOWN_OBSERVATION_SECONDS,
  TestChecklistPanelProps,
} from '@/components/cockpit/TestChecklistPanel';

describe('buildChecklistProgress', () => {
  const baseProps: TestChecklistPanelProps = {
    thermalPower: 850,
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
    expect(checklist[4]).toMatchObject({ id: 'eccs-disconnect', status: 'pending', conditionMet: true });
    expect(checklist[5]).toMatchObject({ id: 'safety-override', status: 'pending', conditionMet: true });
  });

  it('holds the power stabilization step active until the full dwell time is met', () => {
    const completed = advanceChecklistCompletion(
      baseProps,
      { stablePowerSeconds: POWER_HOLD_SECONDS - 1, rundownSeconds: 0 },
    );

    const checklist = buildChecklistProgress(
      baseProps,
      { stablePowerSeconds: POWER_HOLD_SECONDS - 1, rundownSeconds: 0 },
      completed,
    );

    expect(checklist[0]).toMatchObject({ id: 'power-band', status: 'completed', conditionMet: true });
    expect(checklist[1]).toMatchObject({ id: 'power-hold', status: 'active', conditionMet: false });
  });

  it('requires a real rundown observation before opening the final test-end step', () => {
    const preRundownCompleted = advanceChecklistCompletion(
      baseProps,
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: 0 },
    );

    const checklist = buildChecklistProgress(
      { ...baseProps, turbineValveOpen: 0 },
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: RUNDOWN_OBSERVATION_SECONDS - 1 },
      preRundownCompleted,
    );

    expect(checklist[6]).toMatchObject({ id: 'begin-rundown', status: 'completed', conditionMet: true });
    expect(checklist[7]).toMatchObject({ id: 'observe-rundown', status: 'active', conditionMet: false });
    expect(checklist[8]).toMatchObject({ id: 'test-complete', status: 'pending', conditionMet: false });
  });

  it('unlocks the final step after a valid rundown and completes only when the test ends', () => {
    const preRundownCompleted = advanceChecklistCompletion(
      baseProps,
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: 0 },
    );

    const preCompletion = buildChecklistProgress(
      { ...baseProps, turbineValveOpen: 0 },
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: RUNDOWN_OBSERVATION_SECONDS },
      preRundownCompleted,
    );

    expect(preCompletion[7]).toMatchObject({ id: 'observe-rundown', status: 'completed', conditionMet: true });
    expect(preCompletion[8]).toMatchObject({ id: 'test-complete', status: 'active', conditionMet: false });

    const beforeCompletionIds = advanceChecklistCompletion(
      { ...baseProps, turbineValveOpen: 0 },
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: RUNDOWN_OBSERVATION_SECONDS },
      preRundownCompleted,
    );

    const completed = buildChecklistProgress(
      { ...baseProps, turbineValveOpen: 0, testCompleted: true },
      { stablePowerSeconds: POWER_HOLD_SECONDS, rundownSeconds: RUNDOWN_OBSERVATION_SECONDS },
      beforeCompletionIds,
    );

    expect(completed.every((item) => item.status === 'completed')).toBe(true);
  });
});