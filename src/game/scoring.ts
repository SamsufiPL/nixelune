/** Scoring rules as pure functions (GDD section 2). */
import {
  CHAIN_MULTIPLIER_STEP,
  HARD_DROP_POINTS_PER_ROW,
  POINTS_PER_PATH_TILE,
  POINTS_PER_TILE_ABOVE_FOUR,
  STAGE_BONUS_PER_STAGE,
} from './tuning';

/** Base points of one activated path of `size` tiles. */
export function pathPoints(size: number): number {
  return (size - 4) * POINTS_PER_TILE_ABOVE_FOUR + size * POINTS_PER_PATH_TILE;
}

/** Multiplier of the `chain`-th activation step of one move (1-based). */
export function chainMultiplier(chain: number): number {
  return 1 + CHAIN_MULTIPLIER_STEP * (chain - 1);
}

/** Points for all paths activated together in chain step `chain`. */
export function activationPoints(sizes: readonly number[], chain: number): number {
  let base = 0;
  for (const size of sizes) base += pathPoints(size);
  return Math.round(base * chainMultiplier(chain));
}

export function hardDropPoints(rows: number): number {
  return rows * HARD_DROP_POINTS_PER_ROW;
}

/** Bonus for completing endless stage `stage` (1-based). */
export function stageBonus(stage: number): number {
  return stage * STAGE_BONUS_PER_STAGE;
}
