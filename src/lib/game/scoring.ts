import { ReactorState } from "@/lib/physics/types";
import { PHYSICS } from "@/lib/physics/constants";

export function calculateScore(state: ReactorState): number {
  let score = PHYSICS.BASE_SCORE;

  // Abzug für jede Sekunde außerhalb 700–1000 MW
  if (state.thermalPower < PHYSICS.TEST_POWER_MIN || state.thermalPower > PHYSICS.TEST_POWER_MAX) {
    score -= PHYSICS.SCORE_PENALTY_PER_SECOND_OFF_TARGET;
  }

  // Abzug für Alarm-Events
  const alarmCount = state.events.filter(e => e.severity === 'alarm').length;
  score -= alarmCount * PHYSICS.SCORE_PENALTY_PER_ALARM;

  // Bonus bei Test-Erfolg
  if (state.testCompleted) {
    score += PHYSICS.SCORE_BONUS_TEST_SUCCESS;
  }

  // Bonus bei deaktiviertem ECCS und Test-Erfolg
  if (!state.eccsEnabled && state.testCompleted) {
    score += PHYSICS.SCORE_BONUS_ECCS_DISABLED;
  }

  return Math.max(0, score);
}
