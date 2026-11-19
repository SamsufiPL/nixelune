import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/game/game';
import { stageDropIntervalMs } from '../../src/game/stages';
import { MIN_DROP_MS, MIXED_FIRST_STAGE, STAGE_CREEP_GRACE_PIECES } from '../../src/game/tuning';
import type { Command, Game } from '../../src/game/types';
import { evaluateBoard, finishResolving, greedyPolicy, pieceAtSpawn } from '../../tools/bot';
import type { Policy } from '../../tools/bot';
import { enumeratePlacements, resolveMove } from '../../tools/sim';
import { challenge } from './helpers';

const colorsOf = (cells: readonly { color: string }[]): number => new Set(cells.map((c) => c.color)).size;

/** Play one piece (or continue a stage); returns false when the game is over. */
function step(game: Game, policy: Policy): boolean {
  if (game.view.phase === 'over') return false;
  if (game.view.phase === 'stageComplete') game.apply('continue');
  else {
    for (const command of policy(game.view)) game.apply(command);
    finishResolving(game);
  }
  return true;
}

describe('two-colour pieces in endless', () => {
  it('never appear in stages 1-2 and do appear later, in active, ghost, next and hold alike', () => {
    for (const seed of [1, 2, 3]) {
      const game = createGame({ seed, mode: { kind: 'endless' } });
      let mixedLater = 0;
      let mixedNext = 0;
      for (let i = 0; i < 400 && step(game, greedyPolicy); i++) {
        const view = game.view;
        if (view.active === null) continue;
        expect([1, 2]).toContain(colorsOf(view.active));
        expect(view.ghost!.map((c) => c.color)).toEqual(view.active.map((c) => c.color));
        if (view.stage < MIXED_FIRST_STAGE) {
          expect(colorsOf(view.active)).toBe(1);
          expect(colorsOf(view.next.cells)).toBe(1);
        } else {
          if (colorsOf(view.active) === 2) mixedLater++;
          if (colorsOf(view.next.cells) === 2) mixedNext++;
        }
      }
      expect(game.view.stage).toBeGreaterThan(5);
      expect(mixedLater).toBeGreaterThan(50);
      expect(mixedNext).toBeGreaterThan(50);
    }
  });

  it('keep their colours through rotation and hold', () => {
    const game = createGame({ seed: 0, mode: { kind: 'challenge', challenge: { ...challenge([], { colors: ['teal', 'coral'], target: 99 }), mixedShare: 1 } } });
    const colors = game.view.active!.map((c) => c.color);
    expect(new Set(colors).size).toBe(2);
    game.apply('rotateCw');
    expect(game.view.active!.map((c) => c.color)).toEqual(colors);
    game.apply('swap');
    expect(game.view.held!.cells.map((c) => c.color)).toEqual(colors);
    expect(colorsOf(game.view.active!)).toBe(2);
  });
});

describe('two-colour pieces in challenges', () => {
  it('are off unless the challenge sets mixedShare', () => {
    const def = challenge([], { colors: ['teal', 'coral', 'ice'], target: 99, pieceLimit: 60 });
    const plain = createGame({ seed: 0, mode: { kind: 'challenge', challenge: def } });
    const mixed = createGame({ seed: 0, mode: { kind: 'challenge', challenge: { ...def, mixedShare: 1 } } });
    for (let i = 0; i < 20 && plain.view.phase === 'falling' && mixed.view.phase === 'falling'; i++) {
      expect(colorsOf(plain.view.active!)).toBe(1);
      expect(colorsOf(mixed.view.active!)).toBe(2);
      // Same shape stream: the pieces cover the same cells.
      expect(mixed.view.active!.map((c) => [c.col, c.row])).toEqual(plain.view.active!.map((c) => [c.col, c.row]));
      for (const game of [plain, mixed]) {
        game.apply(i % 2 === 0 ? 'left' : 'right');
        game.apply('drop');
        finishResolving(game);
      }
    }
  });
});

describe('gravity creep in play', () => {
  it('closes the idle loophole: a player who sits in a chain stage gets faster and faster', () => {
    // Plays well but refuses every move that would meet the chain goal.
    const idler: Policy = (view) => {
      if (view.goal.kind !== 'chain') return greedyPolicy(view);
      let best: readonly Command[] = ['drop'];
      let bestValue = -Infinity;
      for (const placement of enumeratePlacements(view.cells, pieceAtSpawn(view))) {
        const result = resolveMove(view.cells, placement.landing.restCells, placement.landing.rowsDropped);
        const value = result.points + evaluateBoard(result.board);
        if (result.chain < view.goal.target && value > bestValue) {
          bestValue = value;
          best = placement.commands;
        }
      }
      return best;
    };
    const game = createGame({ seed: 6, mode: { kind: 'endless' } });
    let stage = 1;
    let inStage = 0;
    for (let i = 0; i < 400; i++) {
      const wasFalling = game.view.phase === 'falling';
      expect(step(game, idler)).toBe(true);
      if (wasFalling) inStage++;
      if (game.view.stage !== stage) {
        // A new stage starts from its own base interval again.
        stage = game.view.stage;
        inStage = 0;
        expect(game.view.dropIntervalMs).toBe(stageDropIntervalMs(stage));
      }
      if (game.view.phase === 'falling') expect(game.view.dropIntervalMs).toBe(stageDropIntervalMs(stage, inStage));
    }
    expect(game.view.stage).toBe(4);
    expect(game.view.goal.kind).toBe('chain');
    expect(inStage).toBeGreaterThan(STAGE_CREEP_GRACE_PIECES + 200);
    expect(game.view.dropIntervalMs).toBe(MIN_DROP_MS);
  });

  it('does not touch challenges', () => {
    const game = createGame({ seed: 0, mode: { kind: 'challenge', challenge: challenge([], { colors: ['teal', 'coral', 'ice', 'lilac', 'amber'], target: 99, pieceLimit: 80 }) } });
    const interval = game.view.dropIntervalMs;
    const policy = greedyPolicy;
    for (let i = 0; i < 70 && step(game, policy); i++) expect(game.view.dropIntervalMs).toBe(interval);
  });
});
