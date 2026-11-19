/** Endless stages: goal table and gravity per stage. */
import {
  MIN_DROP_MS,
  STAGE_BASE_DROP_MS,
  STAGE_DROP_FACTOR,
  STAGE_GOAL_CYCLE,
  STAGE_GOAL_TARGETS,
} from './tuning';
import type { GoalKind } from './types';

export interface StageGoal {
  readonly kind: GoalKind;
  readonly target: number;
}

/** Goal of endless stage `stage` (1-based). Kinds cycle; targets grow once per cycle. */
export function stageGoal(stage: number): StageGoal {
  const index = stage - 1;
  const kind = STAGE_GOAL_CYCLE[index % STAGE_GOAL_CYCLE.length] as GoalKind;
  const round = Math.floor(index / STAGE_GOAL_CYCLE.length);
  const { base, perRound, max } = STAGE_GOAL_TARGETS[kind];
  return { kind, target: Math.min(max, Math.floor(base + perRound * round)) };
}

/** Gravity interval of endless stage `stage` (1-based), in ms per row. */
export function stageDropIntervalMs(stage: number): number {
  return Math.max(MIN_DROP_MS, Math.round(STAGE_BASE_DROP_MS * STAGE_DROP_FACTOR ** (stage - 1)));
}
