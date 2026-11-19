/**
 * Beam search over the fixed piece stream of a challenge. It proves a challenge can
 * be won within its piece limit (without using hold) and returns the commands, which
 * the tests replay through the real game.
 */
import { parsePrefill } from '../src/game/board';
import type { Board } from '../src/game/board';
import { createGame } from '../src/game/game';
import { createPieceGenerator } from '../src/game/pieces';
import type { ChallengeDef, Command, GoalKind, Outcome } from '../src/game/types';
import { evaluateBoard, finishResolving } from './bot';
import { enumeratePlacements, resolveMove } from './sim';

interface Node {
  readonly board: Board;
  readonly paths: number;
  readonly tiles: number;
  readonly bestChain: number;
  readonly score: number;
  readonly commands: readonly Command[] | null;
  readonly parent: Node | null;
  readonly value: number;
}

function progress(node: Omit<Node, 'value'>, kind: GoalKind): number {
  switch (kind) {
    case 'paths':
      return node.paths;
    case 'chain':
      return node.bestChain;
    case 'tiles':
      return node.tiles;
    case 'score':
      return node.score;
  }
}

export interface Solution {
  /** One command list per placed piece. */
  readonly moves: readonly (readonly Command[])[];
}

export function solveChallenge(def: ChallengeDef, beamWidth: number, pieceLimit = def.pieceLimit): Solution | null {
  const generator = createPieceGenerator(def.seed, def.colors);
  let beam: Node[] = [
    { board: parsePrefill(def.prefill), paths: 0, tiles: 0, bestChain: 0, score: 0, commands: null, parent: null, value: 0 },
  ];
  for (let depth = 0; depth < pieceLimit && beam.length > 0; depth++) {
    const piece = generator.next(def.mixedShare ?? 0);
    const children: Node[] = [];
    const seen = new Set<string>();
    for (const node of beam) {
      for (const placement of enumeratePlacements(node.board, piece)) {
        const result = resolveMove(node.board, placement.landing.restCells, placement.landing.rowsDropped);
        const child = {
          board: result.board,
          paths: node.paths + result.paths,
          tiles: node.tiles + result.tiles,
          bestChain: Math.max(node.bestChain, result.chain),
          score: node.score + result.points,
          commands: placement.commands,
          parent: node,
        };
        const reached = progress(child, def.goal.kind);
        if (reached >= def.goal.target) return { moves: trace(child) };
        const key = `${reached}|${result.board.map((c) => (c === null ? '.' : c[0])).join('')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        children.push({ ...child, value: (reached / def.goal.target) * 4000 + evaluateBoard(result.board) });
      }
    }
    children.sort((a, b) => b.value - a.value);
    beam = children.slice(0, beamWidth);
  }
  return null;
}

function trace(leaf: Omit<Node, 'value'>): (readonly Command[])[] {
  const moves: (readonly Command[])[] = [];
  for (let node: Omit<Node, 'value'> | null = leaf; node !== null && node.commands !== null; node = node.parent) {
    moves.push(node.commands);
  }
  return moves.reverse();
}

export interface Replay {
  readonly outcome: Outcome | null;
  readonly piecesUsed: number;
  readonly score: number;
}

/** Play a list of per-piece commands through the real game. */
export function replayChallenge(def: ChallengeDef, moves: readonly (readonly Command[])[]): Replay {
  const game = createGame({ seed: 0, mode: { kind: 'challenge', challenge: def } });
  let piecesUsed = 0;
  for (const commands of moves) {
    if (game.view.phase !== 'falling') break;
    for (const command of commands) game.apply(command);
    piecesUsed++;
    finishResolving(game);
  }
  return { outcome: game.view.outcome, piecesUsed, score: game.view.score };
}
