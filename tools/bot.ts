/**
 * Simple players used to check the balance: a greedy bot that scores every reachable
 * placement of the current piece, and a bot that picks placements at random.
 */
import { CELL_COUNT, findGroups } from '../src/game/board';
import { createGame } from '../src/game/game';
import { offsetToAxial } from '../src/game/hex';
import type { Piece } from '../src/game/pieces';
import type { Rng } from '../src/game/rng';
import { SPAWN_COL, SPAWN_ROW } from '../src/game/tuning';
import { BOARD_COLS, BOARD_ROWS } from '../src/game/types';
import type { Command, Game, GameView, Outcome, TileColor } from '../src/game/types';
import { enumeratePlacements, resolveMove } from './sim';

/** A policy sees the view right after a spawn and answers with commands ending in 'drop'. */
export type Policy = (view: GameView) => readonly Command[];

/** The active piece of a view taken right after spawn, as a piece in spawn orientation. */
export function pieceAtSpawn(view: GameView): Piece {
  if (view.active === null) throw new Error('no active piece');
  const pivot = offsetToAxial(SPAWN_COL, SPAWN_ROW);
  return {
    shapeId: 'unknown',
    cells: view.active.map((c) => {
      const a = offsetToAxial(c.col, c.row);
      return { q: a.q - pivot.q, r: a.r - pivot.r, color: c.color };
    }),
  };
}

/** Heuristic value of a settled board: low and flat is good, near-complete groups are good. */
export function evaluateBoard(board: readonly (TileColor | null)[]): number {
  let value = 0;
  for (let col = 0; col < BOARD_COLS; col++) {
    let height = 0;
    for (let row = 0; row < BOARD_ROWS; row++) {
      if (board[row * BOARD_COLS + col] !== null) {
        height = BOARD_ROWS - row;
        break;
      }
    }
    value -= height * height * 3;
    // The spawn area is around the middle columns; stacks reaching it end the game.
    if (height >= BOARD_ROWS - 5) value -= (height - (BOARD_ROWS - 6)) * (Math.abs(col - SPAWN_COL) <= 2 ? 400 : 120);
  }
  for (const group of findGroups(board, 2)) {
    const size = group.cells.length;
    value += size === 2 ? 15 : size === 3 ? 45 : 90;
  }
  return value;
}

/** Rows the greedy bot lets the stack grow to while it waits for a chain. */
const CHAIN_BUILD_HEIGHT = 7;

function maxHeight(board: readonly (TileColor | null)[]): number {
  const first = board.findIndex((c) => c !== null);
  return first === -1 ? 0 : BOARD_ROWS - Math.floor(first / BOARD_COLS);
}

export const greedyPolicy: Policy = (view) => {
  const placements = enumeratePlacements(view.cells, pieceAtSpawn(view));
  let best: readonly Command[] = ['drop'];
  let bestValue = -Infinity;
  for (const placement of placements) {
    const result = resolveMove(view.cells, placement.landing.restCells, placement.landing.rowsDropped);
    let value = result.points + evaluateBoard(result.board);
    if (view.goal.kind === 'chain') {
      // A tidy board never chains: reward the chain itself and keep tiles in play
      // (do not cash in single paths) while the stack is low.
      if (result.chain >= view.goal.target) value += 100000;
      else if (maxHeight(view.cells) < CHAIN_BUILD_HEIGHT) value -= 2 * result.points;
    }
    if (value > bestValue) {
      bestValue = value;
      best = placement.commands;
    }
  }
  return best;
};

export function randomPolicy(rng: Rng): Policy {
  return (view) => {
    const placements = enumeratePlacements(view.cells, pieceAtSpawn(view));
    return placements.length === 0 ? ['drop'] : (placements[rng.int(placements.length)] as { commands: readonly Command[] }).commands;
  };
}

/** Tick until the game leaves 'resolving'. Throws if it never does. */
export function finishResolving(game: Game): void {
  for (let guard = 0; game.view.phase === 'resolving'; guard++) {
    if (guard > 100000) throw new Error('resolution does not end');
    game.tick();
  }
}

export interface RunResult {
  readonly pieces: number;
  readonly score: number;
  readonly stage: number;
  readonly outcome: Outcome | null;
  /** Pieces placed in every completed stage, stage 1 first. */
  readonly piecesPerStage: readonly number[];
  readonly tilesOnBoard: number;
}

/** Play an endless game with a policy until it ends or `maxPieces` were placed. */
export function playEndless(seed: number, policy: Policy, maxPieces: number): RunResult {
  const game = createGame({ seed, mode: { kind: 'endless' } });
  const piecesPerStage: number[] = [];
  let pieces = 0;
  let stageStart = 0;
  while (pieces < maxPieces && game.view.phase !== 'over') {
    if (game.view.phase === 'stageComplete') {
      piecesPerStage.push(pieces - stageStart);
      stageStart = pieces;
      game.apply('continue');
      continue;
    }
    for (const command of policy(game.view)) game.apply(command);
    pieces++;
    finishResolving(game);
    game.drainEvents();
  }
  const view = game.view;
  let tilesOnBoard = 0;
  for (let i = 0; i < CELL_COUNT; i++) if (view.cells[i] !== null) tilesOnBoard++;
  return { pieces, score: view.score, stage: view.stage, outcome: view.outcome, piecesPerStage, tilesOnBoard };
}
