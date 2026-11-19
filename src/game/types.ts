/**
 * Public contract of the game core. The core is pure TypeScript: no DOM, no timers,
 * no platform APIs, no Math.random. Presentation reads `GameView`, sends `Command`s
 * and drains `GameEvent`s. Names exported here are stable; add, do not rename.
 *
 * Grid: pointy-top hexagons in "odd-r" offset layout. `row` grows downwards, odd rows
 * are shifted right by half a cell. Cell centre in units of the hex radius R:
 *   x = sqrt(3) * R * (col + 0.5 * (row & 1)),  y = 1.5 * R * row
 */

export const TILE_COLORS = ['teal', 'coral', 'ice', 'lilac', 'amber'] as const;
export type TileColor = (typeof TILE_COLORS)[number];

export interface Cell {
  readonly col: number;
  readonly row: number;
}

export interface ColoredCell extends Cell {
  readonly color: TileColor;
}

/** A piece outside the board (next / held), as axial offsets from its pivot. */
export interface PiecePreview {
  readonly shapeId: string;
  readonly cells: readonly { readonly q: number; readonly r: number; readonly color: TileColor }[];
}

/** A connected same-colour group of locked tiles. */
export interface TileGroup {
  readonly color: TileColor;
  /** Cells in breadth-first order from `cells[0]`; used for the sequential light flow. */
  readonly cells: readonly Cell[];
  /** Spanning-tree edges between adjacent cells of the group, in the same BFS order. */
  readonly links: readonly (readonly [Cell, Cell])[];
}

export type GoalKind =
  /** Activate `target` paths (groups of at least ACTIVATION_THRESHOLD). */
  | 'paths'
  /** Reach a chain (cascade) of length `target` in a single move. */
  | 'chain'
  /** Clear `target` tiles in total. */
  | 'tiles'
  /** Score `target` points within the stage / challenge. */
  | 'score';

export interface Goal {
  readonly kind: GoalKind;
  readonly target: number;
  readonly progress: number;
}

export interface ChallengeDef {
  /** Stable id, persisted in saves. Never reuse or renumber. */
  readonly id: string;
  readonly seed: number;
  /**
   * Starting layout, top row first, one string per row, one char per column:
   * '.' empty, 't' teal, 'c' coral, 'i' ice, 'l' lilac, 'a' amber.
   * May list only the bottom rows; missing rows above are empty.
   */
  readonly prefill: readonly string[];
  readonly goal: { readonly kind: GoalKind; readonly target: number };
  /** Number of pieces the player may place. */
  readonly pieceLimit: number;
  /** Colours used by the piece generator in this challenge. */
  readonly colors: readonly TileColor[];
}

export type GameMode =
  | { readonly kind: 'endless' }
  | { readonly kind: 'challenge'; readonly challenge: ChallengeDef };

export interface GameConfig {
  readonly seed: number;
  readonly mode: GameMode;
}

export type Command =
  | 'left'
  | 'right'
  | 'rotateCw'
  | 'rotateCcw'
  /** Hard drop: the piece lands at the ghost position at once. */
  | 'drop'
  /** Swap the active piece with the held one (once per piece). */
  | 'swap'
  /** Leave the `stageComplete` phase and start the next stage. */
  | 'continue';

export type GamePhase =
  /** A piece is falling and accepts commands. */
  | 'falling'
  /** Tiles are settling / paths are lit / tiles collapse; commands are ignored. */
  | 'resolving'
  /** Endless only: the stage goal was met; waits for `continue`. */
  | 'stageComplete'
  /** The run has ended; see `GameView.outcome`. */
  | 'over';

export type Outcome = 'blocked' | 'challengeWon' | 'challengeFailed';

export interface GameView {
  readonly cols: number;
  readonly rows: number;
  /** Locked tiles, row-major: index = row * cols + col. */
  readonly cells: readonly (TileColor | null)[];
  readonly phase: GamePhase;
  readonly outcome: Outcome | null;
  readonly mode: GameMode;
  /** Board cells of the falling piece, or null when none is in play. */
  readonly active: readonly ColoredCell[] | null;
  /** Where the active piece's tiles will rest after a drop (tiles settle one by one). */
  readonly ghost: readonly ColoredCell[] | null;
  readonly next: PiecePreview;
  readonly held: PiecePreview | null;
  readonly canSwap: boolean;
  readonly score: number;
  /** 1-based stage number (endless); always 1 in a challenge. */
  readonly stage: number;
  /** Length of the chain in progress, or of the last finished one. 0 before any. */
  readonly chain: number;
  readonly goal: Goal;
  /** Challenge only: pieces left to place; null in endless. */
  readonly piecesLeft: number | null;
  /** Same-colour groups of two or more locked tiles (for drawing forming paths). */
  readonly groups: readonly TileGroup[];
  /** Groups lit right now (phase 'resolving', before removal); empty otherwise. */
  readonly activating: readonly TileGroup[];
  /** Current gravity interval, for presentation pacing only. */
  readonly dropIntervalMs: number;
}

export interface TileMove {
  readonly from: Cell;
  readonly to: Cell;
  readonly color: TileColor;
}

export type GameEvent =
  | { readonly type: 'spawned' }
  | { readonly type: 'moved'; readonly dir: 'left' | 'right' }
  | { readonly type: 'rotated' }
  /** A command was valid for the phase but blocked by walls or tiles. */
  | { readonly type: 'blocked'; readonly command: Command }
  | { readonly type: 'swapped' }
  | { readonly type: 'locked'; readonly cells: readonly ColoredCell[]; readonly hard: boolean; readonly rowsDropped: number }
  /** Tiles fell after a lock or after a removal. Empty moves are not reported. */
  | { readonly type: 'settled'; readonly moves: readonly TileMove[] }
  /** Paths lit up; they are removed when the activation window ends. */
  | { readonly type: 'activated'; readonly groups: readonly TileGroup[]; readonly chain: number; readonly points: number }
  | { readonly type: 'removed'; readonly cells: readonly ColoredCell[] }
  | { readonly type: 'chainEnded'; readonly length: number; readonly points: number }
  | { readonly type: 'goalProgress'; readonly goal: Goal }
  | { readonly type: 'stageCompleted'; readonly stage: number; readonly bonus: number }
  | { readonly type: 'stageStarted'; readonly stage: number }
  | { readonly type: 'over'; readonly outcome: Outcome; readonly score: number; readonly stage: number };

export interface Game {
  readonly view: GameView;
  /** Queue-free: applied at once; ignored when the phase does not accept it. */
  apply(command: Command): void;
  /** Advance the simulation by exactly TICK_MS. */
  tick(): void;
  /** Return and clear the events produced since the last call. */
  drainEvents(): GameEvent[];
}

/** Fixed simulation step. The app loop feeds ticks from an accumulator with a catch-up cap. */
export const TICK_MS = 1000 / 60;
/** Board size from the GDD. */
export const BOARD_COLS = 9;
export const BOARD_ROWS = 15;
/** Minimum group size that activates a path. */
export const ACTIVATION_THRESHOLD = 5;

// Implemented in ./game.ts:  export function createGame(config: GameConfig): Game
// Implemented in ./challenges.ts:  export const CHALLENGES: readonly ChallengeDef[]
