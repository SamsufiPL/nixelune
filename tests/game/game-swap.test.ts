import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/game/game';
import type { Game } from '../../src/game/types';
import { challenge, types } from './helpers';

const endless = (seed = 1): Game => createGame({ seed, mode: { kind: 'endless' } });

describe('swap / hold', () => {
  it('stores the active piece and brings in the next one, once per piece', () => {
    const game = endless(4);
    game.drainEvents();
    const spawnCells = game.view.active!;
    const next = game.view.next;
    game.apply('rotateCw');
    game.apply('left');
    for (let i = 0; i < 100; i++) game.tick();
    game.drainEvents();

    game.apply('swap');
    expect(game.drainEvents()).toEqual([{ type: 'swapped' }]);
    expect(game.view.held!.cells.map((c) => c.color)).toEqual(spawnCells.map((c) => c.color));
    expect(game.view.held!.cells).toHaveLength(spawnCells.length);
    expect(game.view.canSwap).toBe(false);
    expect(game.view.next).not.toBe(next);
    expect(game.view.active!.length).toBe(next.cells.length);
    expect(Math.min(...game.view.active!.map((c) => c.row))).toBeLessThanOrEqual(1);

    const held = game.view.held;
    game.apply('swap');
    expect(game.drainEvents()).toEqual([{ type: 'blocked', command: 'swap' }]);
    expect(game.view.held).toBe(held);
  });

  it('returns the held piece at the spawn position in spawn orientation', () => {
    const game = endless(4);
    const spawnCells = game.view.active!;
    game.apply('rotateCw');
    game.apply('right');
    game.apply('swap');
    game.apply('drop');
    expect(game.view.canSwap).toBe(true);
    const upcoming = game.view.next;
    const active = game.view.active!;
    game.drainEvents();
    game.apply('swap');
    expect(types(game.drainEvents())).toEqual(['swapped']);
    expect(game.view.active).toEqual(spawnCells);
    // With a piece in hold the queue does not advance.
    expect(game.view.next).toBe(upcoming);
    expect(game.view.held!.cells).toHaveLength(active.length);
  });

  it('is refused, not fatal, when the incoming piece has no room', () => {
    // Pillars reach into the lowest spawn row: flat shapes still spawn, taller ones do not.
    const tower = Array.from({ length: 13 }, (_, i) => `...${'cil'[i % 3]!.repeat(3)}...`);
    let refused = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const def = challenge(tower, { colors: ['amber'], target: 99, seed });
      const game = createGame({ seed: 0, mode: { kind: 'challenge', challenge: def } });
      if (game.view.phase !== 'falling') continue;
      game.drainEvents();
      const before = game.view;
      game.apply('swap');
      const events = game.drainEvents();
      if (events[0]!.type === 'swapped') continue;
      refused++;
      expect(events).toEqual([{ type: 'blocked', command: 'swap' }]);
      expect(game.view).toBe(before);
      expect(game.view).toMatchObject({ phase: 'falling', held: null, canSwap: true });
    }
    expect(refused).toBeGreaterThan(0);
  });
});
