import { describe, expect, it } from 'vitest';
import { findGroups, isSettled } from '../../src/game/board';
import { createGame } from '../../src/game/game';
import { createRng } from '../../src/game/rng';
import { ACTIVATION_THRESHOLD, TICK_MS } from '../../src/game/types';
import type { Command, Game, GameEvent } from '../../src/game/types';

const COMMANDS: readonly Command[] = ['left', 'right', 'rotateCw', 'rotateCcw', 'drop', 'swap', 'continue'];

/** Drive a game with a seeded stream of commands and ticks; returns everything it emitted. */
function script(game: Game, scriptSeed: number, steps: number, check?: (game: Game) => void): GameEvent[] {
  const rng = createRng(scriptSeed);
  const events: GameEvent[] = [];
  for (let i = 0; i < steps; i++) {
    if (rng.int(4) === 0) game.apply(COMMANDS[rng.int(COMMANDS.length)]!);
    else game.tick();
    events.push(...game.drainEvents());
    check?.(game);
  }
  return events;
}

describe('view', () => {
  it('returns the same objects while nothing changes and replaces only what changed', () => {
    const game = createGame({ seed: 8, mode: { kind: 'endless' } });
    game.apply('drop');
    const view = game.view;
    expect(game.view).toBe(view);
    game.tick();
    expect(game.view).toBe(view);

    game.apply('left');
    const moved = game.view;
    expect(moved).not.toBe(view);
    expect(moved.active).not.toBe(view.active);
    expect(moved.cells).toBe(view.cells);
    expect(moved.groups).toBe(view.groups);
    expect(moved.next).toBe(view.next);
    expect(moved.goal).toBe(view.goal);

    game.apply('drop');
    expect(game.view.cells).not.toBe(view.cells);
    expect(view.cells.filter((c) => c !== null).length).toBeLessThan(game.view.cells.filter((c) => c !== null).length);
  });

  it('lists groups of two or more locked tiles, matching the board', () => {
    const game = createGame({ seed: 8, mode: { kind: 'endless' } });
    script(game, 3, 3000, (g) => {
      const view = g.view;
      expect(view.groups).toEqual(findGroups(view.cells, 2));
      if (view.phase !== 'resolving') expect(view.activating).toHaveLength(0);
      else {
        // Lit groups are still on the board; only the light's starting tile may differ.
        const sets = view.groups.map((group) => group.cells.map((c) => `${c.col},${c.row}`).sort().join(' '));
        for (const group of view.activating) expect(sets).toContain(group.cells.map((c) => `${c.col},${c.row}`).sort().join(' '));
      }
    });
  });
});

describe('invariants', () => {
  it('keeps the board settled and free of ready paths whenever a piece is in play', () => {
    for (const seed of [1, 2, 3]) {
      const game = createGame({ seed, mode: { kind: 'endless' } });
      let score = 0;
      let locks = 0;
      const events = script(game, seed + 50, 20000, (g) => {
        const view = g.view;
        expect(view.score).toBeGreaterThanOrEqual(score);
        score = view.score;
        expect(view.active === null).toBe(view.phase !== 'falling');
        expect(view.ghost === null).toBe(view.active === null);
        if (view.phase !== 'resolving') {
          expect(isSettled(view.cells)).toBe(true);
          expect(findGroups(view.cells, ACTIVATION_THRESHOLD)).toHaveLength(0);
        }
        if (view.active !== null) for (const cell of view.active) expect(view.cells[cell.row * view.cols + cell.col]).toBeNull();
      });
      locks += events.filter((e) => e.type === 'locked').length;
      expect(locks).toBeGreaterThan(5);
      // Every chain is closed, and its points are the sum of its activations.
      let open = 0;
      for (const e of events) {
        if (e.type === 'activated') open += e.points;
        if (e.type === 'chainEnded') {
          expect(e.points).toBe(open);
          open = 0;
        }
        if (e.type === 'spawned') expect(open).toBe(0);
      }
    }
  });
});

describe('determinism', () => {
  it('produces identical events and views for the same seed and commands', () => {
    const run = (seed: number): string => {
      const game = createGame({ seed, mode: { kind: 'endless' } });
      const events = script(game, 99, 15000);
      return JSON.stringify([events, game.view]);
    };
    const first = run(123);
    expect(run(123)).toBe(first);
    expect(run(124)).not.toBe(first);
    expect(first.length).toBeGreaterThan(5000);
  });
});

describe('performance', () => {
  it('ticks and serves the view far inside the frame budget', () => {
    const game = createGame({ seed: 5, mode: { kind: 'endless' } });
    const rng = createRng(1);
    const ticks = 60000;
    const start = performance.now();
    for (let i = 0; i < ticks; i++) {
      if (i % 20 === 0) game.apply(COMMANDS[rng.int(COMMANDS.length)]!);
      game.tick();
      void game.view.ghost;
      if (i % 600 === 0) game.drainEvents();
    }
    const perTick = (performance.now() - start) / ticks;
    // A frame is 16.7 ms; one tick with a view read must stay under 1% of it even on a slow CI box.
    expect(perTick).toBeLessThan(TICK_MS / 100);

    const reads = 200000;
    const before = performance.now();
    let same = 0;
    const view = game.view;
    for (let i = 0; i < reads; i++) if (game.view === view) same++;
    expect(same).toBe(reads);
    expect((performance.now() - before) / reads).toBeLessThan(0.001);
  });
});
