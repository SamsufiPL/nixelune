/**
 * Every tuning constant of the simulation, each with its unit and the reason for its
 * value. Rules that are part of the public contract (board size, activation threshold,
 * tick length) live in `types.ts`.
 */
import type { GoalKind } from './types';

// --- Spawn -----------------------------------------------------------------------

/** Offset column of the pivot at spawn. Unit: column. Centre of the 9-wide board. */
export const SPAWN_COL = 4;
/**
 * Offset row of the pivot at spawn. Unit: row. Row 1 keeps every spawn orientation
 * (all shapes reach at most one row above the pivot) inside the board while leaving
 * the largest possible playing height.
 */
export const SPAWN_ROW = 1;

// --- Falling and locking ---------------------------------------------------------

/**
 * Time a grounded piece waits before it locks. Unit: ticks (30 = 500 ms).
 * Long enough to slide a piece under an overhang with a thumb, short enough that
 * the board never feels frozen.
 */
export const LOCK_DELAY_TICKS = 30;
/**
 * How many times a successful move or rotation may restart the lock delay for one
 * piece. Unit: count. Stops endless stalling on the ground; 8 is enough for a
 * deliberate slide across the whole board width.
 */
export const MAX_LOCK_RESETS = 8;
/**
 * Wall kicks tried in order when a rotation does not fit, as axial shifts of the
 * pivot [dq, dr]. Unit: cells. In place, one cell west / east, one row down (both
 * lower neighbours; lets a piece rotate right under the ceiling), two cells west /
 * east (shapes that reach two cells from the pivot next to a wall), and last one row
 * up (floor kick, both upper neighbours).
 */
export const ROTATION_KICKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-2, 0],
  [2, 0],
  [0, -1],
  [1, -1],
];

// --- Resolution pacing -----------------------------------------------------------

/**
 * How long activated paths stay lit before removal. Unit: ticks (15 = 250 ms).
 * The art direction asks for the light flow to take 200-260 ms.
 */
export const ACTIVATION_TICKS = 15;
/**
 * Pause after tiles collapsed into the gaps, before the next activation check or the
 * next spawn. Unit: ticks (8 = 133 ms). Gives the fall a visible beat (motion budget
 * 120-260 ms). Skipped when nothing moved.
 */
export const COLLAPSE_TICKS = 8;

// --- Scoring (GDD section 2) -----------------------------------------------------

/** Points per tile of an activated path above four tiles. Unit: points. From the GDD. */
export const POINTS_PER_TILE_ABOVE_FOUR = 100;
/** Points per tile of an activated path. Unit: points. From the GDD. */
export const POINTS_PER_PATH_TILE = 60;
/** Multiplier added per chain step after the first. Unit: factor. From the GDD. */
export const CHAIN_MULTIPLIER_STEP = 0.5;
/** Points per row of a hard drop. Unit: points per row. Small reward for tempo. */
export const HARD_DROP_POINTS_PER_ROW = 2;
/**
 * Stage bonus = this value x stage number. Unit: points. The kit's mockup shows
 * +2 400 for stage 4; a linear table keeps the bonus near one or two good moves.
 */
export const STAGE_BONUS_PER_STAGE = 600;

// --- Endless stages --------------------------------------------------------------

/** Gravity interval of stage 1. Unit: ms per row. Calm start, as in the prototype. */
export const STAGE_BASE_DROP_MS = 800;
/**
 * Gravity interval factor per stage. Unit: factor. 0.92 reaches half the starting
 * interval around stage 9 - the tempo rises steadily, never in jumps.
 */
export const STAGE_DROP_FACTOR = 0.92;
/**
 * Fastest gravity interval. Unit: ms per row. A full fall still takes about two
 * seconds, so with the lock delay the game stays playable by touch.
 */
export const MIN_DROP_MS = 150;
/** Gravity interval in challenges. Unit: ms per row. Challenges are about planning. */
export const CHALLENGE_DROP_MS = 900;

/**
 * Goal kinds of consecutive stages; the table repeats, each pass is one "round".
 * The chain goal closes a round: it is the one a tidy player has to plan for.
 */
export const STAGE_GOAL_CYCLE: readonly GoalKind[] = ['paths', 'tiles', 'score', 'chain'];
/**
 * Goal target per kind: `floor(base + perRound * round)`, capped at `max`. Unit:
 * paths / tiles / points / chain length. Sized with tools/balance.ts: the greedy bot
 * needs 17-22 pieces for stage 1 and 10-25 for most later stages, which is about
 * 1-2 minutes per stage for a person. Mono-colour pieces make paths cheap (two
 * touching pieces of one colour are a path), hence targets well above the GDD's
 * "connect 3 paths" example. A chain longer than 3 depends too much on luck to be
 * a gate, hence the cap.
 */
export const STAGE_GOAL_TARGETS: Readonly<Record<GoalKind, { base: number; perRound: number; max: number }>> = {
  paths: { base: 8, perRound: 2, max: 30 },
  tiles: { base: 50, perRound: 10, max: 200 },
  score: { base: 5000, perRound: 1000, max: 30000 },
  chain: { base: 2, perRound: 0.5, max: 3 },
};

// --- Piece generator -------------------------------------------------------------

/** Copies of every shape per bag. Unit: count. One: no shape repeats within a bag. */
export const SHAPE_BAG_COPIES = 1;
/** Longest allowed run of one shape. Unit: pieces. */
export const MAX_SHAPE_RUN = 1;
/** Copies of every colour per bag. Unit: count. Two leaves room for pairs. */
export const COLOR_BAG_COPIES = 2;
/** Longest allowed run of one colour. Unit: pieces. Pairs help, triples feel rigged. */
export const MAX_COLOR_RUN = 2;

// --- View ------------------------------------------------------------------------

/** Smallest same-colour group reported in `view.groups`. Unit: tiles. */
export const VIEW_GROUP_MIN = 2;
