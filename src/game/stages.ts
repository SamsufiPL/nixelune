/** Endless stages: goal table and gravity per stage. */
import {
  MIN_DROP_MS,
  MIXED_FIRST_STAGE,
  MIXED_SHARE_MAX,
  MIXED_SHARE_PER_STAGE,
  MIXED_SHARE_START,
  STAGE_CREEP_FACTOR,
  STAGE_CREEP_GRACE_PIECES,
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

/**
 * Gravity interval of endless stage `stage` (1-based), in ms per row. It creeps down
 * once more than STAGE_CREEP_GRACE_PIECES pieces were placed inside the stage.
 */
export function stageDropIntervalMs(stage: number, piecesInStage = 0): number {
  const creep = STAGE_CREEP_FACTOR ** Math.max(0, piecesInStage - STAGE_CREEP_GRACE_PIECES);
  return Math.max(MIN_DROP_MS, Math.round(STAGE_BASE_DROP_MS * STAGE_DROP_FACTOR ** (stage - 1) * creep));
}

/** Share of two-colour pieces generated during endless stage `stage` (1-based), 0..1. */
export function stageMixedShare(stage: number): number {
  if (stage < MIXED_FIRST_STAGE) return 0;
  return Math.min(MIXED_SHARE_MAX, MIXED_SHARE_START + MIXED_SHARE_PER_STAGE * (stage - MIXED_FIRST_STAGE));
}
