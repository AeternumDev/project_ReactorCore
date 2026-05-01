import { ReactorState } from "@/lib/physics/types";
import { PHYSICS } from "@/lib/physics/constants";

export function calculateScore(state: ReactorState): number {
  let score = PHYSICS.BASE_SCORE;

  // Abzug für jede Sekunde außerhalb des 700-MW-Haltekorridors.
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

  // Bonus für stabile Leistung: ≥60s nahe 700 MW bei kontrolliertem Xenon.
  if (
    state.thermalPower >= PHYSICS.TEST_POWER_MIN &&
    state.thermalPower <= PHYSICS.TEST_POWER_MAX &&
    state.xenonConcentration < 1.2 &&
    state.elapsedSeconds >= 60
  ) {
    score += PHYSICS.SCORE_BONUS_STABLE_LOW_POWER;
  }

  // Risiko/Belohnung: Danger Zone (~200 MW) gibt Effizienz-Bonus, aber extrem volatil
  if (
    state.thermalPower >= PHYSICS.DANGER_POWER_LEVEL - 50 &&
    state.thermalPower <= PHYSICS.DANGER_POWER_LEVEL + 100
  ) {
    score += PHYSICS.SCORE_BONUS_DANGER_ZONE;
  }

  return Math.max(0, score);
}
