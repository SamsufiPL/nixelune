/**
 * Instant (untimed) model of one move for bots and the challenge solver: where a
 * piece can be put with the real movement rules and what the board looks like after
 * the whole chain resolved. Built from the same pure functions the game uses; the
 * tests replay bot moves through the real game to prove both agree.
 */
import { findGroups, removeGroups, settle } from '../src/game/board';
import type { Board } from '../src/game/board';
import { cellIndex } from '../src/game/hex';
import { landing, rotated, shifted, spawnPiece, fits } from '../src/game/motion';
import type { ActivePiece, Landing } from '../src/game/motion';
import type { Piece } from '../src/game/pieces';
import { activationPoints, hardDropPoints } from '../src/game/scoring';
import { ACTIVATION_THRESHOLD } from '../src/game/types';
import type { ColoredCell, Command, TileColor } from '../src/game/types';

export interface MoveResult {
  readonly board: Board;
  /** Points of the move, hard drop included. */
  readonly points: number;
  readonly chain: number;
  readonly paths: number;
  readonly tiles: number;
}

/** Put tiles on their resting cells and resolve all chains at once. */
export function resolveMove(board: readonly (TileColor | null)[], restCells: readonly ColoredCell[], rowsDropped = 0): MoveResult {
  const next = board.slice();
  let moved = new Set<number>();
  for (const cell of restCells) {
    const index = cellIndex(cell.col, cell.row);
    next[index] = cell.color;
    moved.add(index);
  }
  let points = hardDropPoints(rowsDropped);
  let chain = 0;
  let paths = 0;
  let tiles = 0;
  for (;;) {
    const groups = findGroups(next, ACTIVATION_THRESHOLD, moved);
    if (groups.length === 0) break;
    chain++;
    const sizes = groups.map((g) => g.cells.length);
    points += activationPoints(sizes, chain);
    paths += groups.length;
    for (const size of sizes) tiles += size;
    removeGroups(next, groups);
    const moves = settle(next);
    if (moves.length === 0) break;
    moved = new Set(moves.map((m) => cellIndex(m.to.col, m.to.row)));
  }
  return { board: next, points, chain, paths, tiles };
}

export interface Placement {
  /** Commands from the spawn position, ending with 'drop'. */
  readonly commands: readonly Command[];
  readonly landing: Landing;
}

/**
 * Every distinct resting position reachable right after spawn by rotating (0-5 times
 * clockwise), sliding sideways and hard dropping. Empty when the piece cannot spawn.
 */
export function enumeratePlacements(board: readonly (TileColor | null)[], piece: Piece): Placement[] {
  const start = spawnPiece(piece);
  if (!fits(board, start)) return [];
  const out: Placement[] = [];
  const seen = new Set<string>();
  const add = (active: ActivePiece, commands: Command[]): void => {
    const landed = landing(board, active);
    const key = landed.restCells
      .map((c) => `${cellIndex(c.col, c.row)}${c.color[0]}`)
      .sort()
      .join(',');
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ commands: [...commands, 'drop'], landing: landed });
  };
  let turned: ActivePiece | null = start;
  const turns: Command[] = [];
  for (let k = 0; k < 6 && turned !== null; k++) {
    add(turned, turns);
    for (const dir of [-1, 1] as const) {
      const command: Command = dir === -1 ? 'left' : 'right';
      const slides: Command[] = [...turns];
      for (let at = shifted(board, turned, dir); at !== null; at = shifted(board, at, dir)) {
        slides.push(command);
        add(at, slides);
      }
    }
    turned = rotated(board, turned, 'cw');
    turns.push('rotateCw');
  }
  return out;
}
