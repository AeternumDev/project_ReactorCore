import { ReactorState } from "@/lib/physics/types";
import { PHYSICS } from "@/lib/physics/constants";

type ScoreUpdate = Pick<
  ReactorState,
  | "score"
  | "scoreStablePowerSeconds"
  | "scoreAwardedStablePowerBonus"
  | "scoreAwardedTestCompletionBonus"
  | "scoreAwardedEccsDisabledBonus"
  | "scorePenalizedEventCount"
>;

const STABLE_LOW_POWER_XENON_LIMIT = 1.2;

export function calculateScore(previousState: ReactorState, state: ReactorState): ScoreUpdate {
  const elapsedDelta = Math.max(0, state.elapsedSeconds - previousState.elapsedSeconds);
  let score = Number.isFinite(previousState.score) ? previousState.score : PHYSICS.BASE_SCORE;

  if (isOutsideTestPowerBand(state)) {
    score -= PHYSICS.SCORE_PENALTY_PER_SECOND_OFF_TARGET * elapsedDelta;
  }

  const firstUnpenalizedEvent = Math.max(0, previousState.scorePenalizedEventCount ?? 0);
  const newEvents = state.events.slice(firstUnpenalizedEvent);
  for (const event of newEvents) {
    if (event.severity === "alarm") {
      score -= PHYSICS.SCORE_PENALTY_PER_ALARM;
    } else if (event.severity === "critical") {
      score -= PHYSICS.SCORE_PENALTY_PER_CRITICAL;
    }
  }

  const stablePowerSeconds = isStableLowPowerState(state)
    ? previousState.scoreStablePowerSeconds + elapsedDelta
    : 0;
  let scoreAwardedStablePowerBonus = previousState.scoreAwardedStablePowerBonus;
  if (!scoreAwardedStablePowerBonus && stablePowerSeconds >= 60) {
    score += PHYSICS.SCORE_BONUS_STABLE_LOW_POWER;
    scoreAwardedStablePowerBonus = true;
  }

  let scoreAwardedTestCompletionBonus = previousState.scoreAwardedTestCompletionBonus;
  if (state.testCompleted && !scoreAwardedTestCompletionBonus) {
    score += PHYSICS.SCORE_BONUS_TEST_SUCCESS;
    scoreAwardedTestCompletionBonus = true;
  }

  let scoreAwardedEccsDisabledBonus = previousState.scoreAwardedEccsDisabledBonus;
  if (state.testCompleted && !state.eccsEnabled && !scoreAwardedEccsDisabledBonus) {
    score += PHYSICS.SCORE_BONUS_ECCS_DISABLED;
    scoreAwardedEccsDisabledBonus = true;
  }

  return {
    score: Math.max(0, Math.round(score)),
    scoreStablePowerSeconds: stablePowerSeconds,
    scoreAwardedStablePowerBonus,
    scoreAwardedTestCompletionBonus,
    scoreAwardedEccsDisabledBonus,
    scorePenalizedEventCount: state.events.length,
  };
}

function isOutsideTestPowerBand(state: ReactorState): boolean {
  return state.thermalPower < PHYSICS.TEST_POWER_MIN || state.thermalPower > PHYSICS.TEST_POWER_MAX;
}

function isStableLowPowerState(state: ReactorState): boolean {
  return (
    !state.isExploded &&
    state.thermalPower >= PHYSICS.TEST_POWER_MIN &&
    state.thermalPower <= PHYSICS.TEST_POWER_MAX &&
    state.xenonConcentration < STABLE_LOW_POWER_XENON_LIMIT
  );
}
