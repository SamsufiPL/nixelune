import { describe, expect, it } from 'vitest';
import { isSettled } from '../../src/game/board';
import { createGame } from '../../src/game/game';
import { pathPoints } from '../../src/game/scoring';
import { ACTIVATION_TICKS, CHALLENGE_DROP_MS, COLLAPSE_TICKS, LOCK_DELAY_TICKS, SPAWN_COL, STAGE_BASE_DROP_MS } from '../../src/game/tuning';
import { BOARD_COLS, BOARD_ROWS, TICK_MS } from '../../src/game/types';
import type { Game } from '../../src/game/types';
import { challenge, key, ofType, resolve, types } from './helpers';

const endless = (seed = 1): Game => createGame({ seed, mode: { kind: 'endless' } });
const play = (prefill: readonly string[], options: Parameters<typeof challenge>[1] = {}): Game =>
  createGame({ seed: 0, mode: { kind: 'challenge', challenge: challenge(prefill, options) } });
const STAGE1_TICKS = Math.round(STAGE_BASE_DROP_MS / TICK_MS);

describe('start', () => {
  it('opens an endless game with a falling piece near the top centre', () => {
    const game = endless();
    const view = game.view;
    expect(types(game.drainEvents())).toEqual(['stageStarted', 'spawned']);
    expect(game.drainEvents()).toEqual([]);
    expect([view.cols, view.rows, view.cells.length]).toEqual([BOARD_COLS, BOARD_ROWS, BOARD_COLS * BOARD_ROWS]);
    expect(view.phase).toBe('falling');
    expect(view.outcome).toBeNull();
    expect(view.active!.length).toBeGreaterThanOrEqual(3);
    for (const cell of view.active!) {
      expect(cell.row).toBeLessThanOrEqual(2);
      expect(Math.abs(cell.col - SPAWN_COL)).toBeLessThanOrEqual(2);
    }
    expect(view).toMatchObject({ score: 0, stage: 1, chain: 0, held: null, canSwap: true, piecesLeft: null });
    expect(view.goal).toEqual({ kind: 'paths', target: 8, progress: 0 });
    expect(view.dropIntervalMs).toBe(STAGE_BASE_DROP_MS);
    expect(view.groups).toEqual([]);
    expect(view.activating).toEqual([]);
    expect(view.next.cells.length).toBeGreaterThanOrEqual(3);
  });

  it('opens a challenge with its prefill, goal and piece limit', () => {
    const game = play(['.tttt....'], { pieceLimit: 4, kind: 'tiles', target: 9 });
    expect(types(game.drainEvents())).toEqual(['spawned']);
    expect(game.view.cells.filter((c) => c === 'teal')).toHaveLength(4);
    expect(game.view.groups.map((g) => g.cells.length)).toEqual([4]);
    expect(game.view).toMatchObject({ piecesLeft: 4, stage: 1, dropIntervalMs: CHALLENGE_DROP_MS });
    expect(game.view.goal).toEqual({ kind: 'tiles', target: 9, progress: 0 });
  });
});

describe('falling', () => {
  it('steps one row per gravity interval and keeps the columns over two rows', () => {
    const game = endless();
    const start = game.view.active!;
    for (let i = 0; i < STAGE1_TICKS - 1; i++) game.tick();
    expect(game.view.active).toBe(start);
    game.tick();
    expect(game.view.active!.map((c) => c.row)).toEqual(start.map((c) => c.row + 1));
    for (let i = 0; i < STAGE1_TICKS; i++) game.tick();
    expect(game.view.active!.map((c) => [c.col, c.row])).toEqual(start.map((c) => [c.col, c.row + 2]));
  });

  it('moves sideways, reports walls as blocked', () => {
    const game = endless();
    game.drainEvents();
    const before = game.view.active!;
    game.apply('right');
    expect(game.view.active!.map((c) => c.col)).toEqual(before.map((c) => c.col + 1));
    expect(game.drainEvents()).toEqual([{ type: 'moved', dir: 'right' }]);
    for (let i = 0; i < 9; i++) game.apply('left');
    const events = game.drainEvents();
    expect(Math.min(...game.view.active!.map((c) => c.col))).toBe(0);
    expect(events.at(-1)).toEqual({ type: 'blocked', command: 'left' });
    expect(events.filter((e) => e.type === 'moved').length).toBeGreaterThanOrEqual(3);
  });

  it('rotates in both directions', () => {
    const game = endless();
    game.drainEvents();
    for (let i = 0; i < 4; i++) game.tick();
    const before = game.view.active!;
    game.apply('rotateCw');
    expect(game.view.active).not.toEqual(before);
    game.apply('rotateCcw');
    expect(game.view.active).toEqual(before);
    expect(game.drainEvents()).toEqual([{ type: 'rotated' }, { type: 'rotated' }]);
  });

  it('locks after the lock delay on the ground; a slide restarts the delay', () => {
    const lockTick = (slideAt: number | null): { landed: number; locked: number } => {
      const game = endless(3);
      game.drainEvents();
      let landed = 0;
      let last = game.view.active;
      for (let tick = 1; tick < 5000; tick++) {
        if (slideAt !== null && tick === slideAt) game.apply('left');
        game.tick();
        const events = game.drainEvents();
        const locked = ofType(events, 'locked')[0];
        if (locked !== undefined) {
          expect(locked).toMatchObject({ hard: false, rowsDropped: 0 });
          expect(types(events).filter((t) => t !== 'settled')).toEqual(['locked', 'spawned']);
          return { landed, locked: tick };
        }
        if (game.view.active !== last && !events.some((e) => e.type === 'moved')) landed = tick;
        last = game.view.active;
      }
      throw new Error('never locked');
    };
    const plain = lockTick(null);
    expect(plain.locked - plain.landed).toBe(LOCK_DELAY_TICKS);
    const slid = lockTick(plain.landed + 11);
    expect(slid.locked).toBe(plain.landed + 10 + LOCK_DELAY_TICKS);
  });

  it('cannot stall forever by sliding on the ground', () => {
    const game = endless(3);
    game.drainEvents();
    let locked = false;
    for (let tick = 0; tick < 5000 && !locked; tick++) {
      game.apply(tick % 2 === 0 ? 'left' : 'right');
      game.tick();
      locked = game.drainEvents().some((e) => e.type === 'locked');
    }
    expect(locked).toBe(true);
  });
});

describe('hard drop and ghost', () => {
  it('lands at once on the ghost cells, pays 2 points per row and spawns the next piece', () => {
    const game = endless(5);
    game.drainEvents();
    game.apply('rotateCw');
    game.apply('right');
    game.drainEvents();
    const ghost = game.view.ghost!;
    const active = game.view.active!;
    expect(ghost).toHaveLength(active.length);
    ghost.forEach((cell, i) => expect(cell.color).toBe(active[i]!.color));
    const next = game.view.next;
    game.apply('drop');
    const events = game.drainEvents();
    const locked = ofType(events, 'locked')[0]!;
    expect(locked.hard).toBe(true);
    expect(locked.rowsDropped).toBeGreaterThan(8);
    expect(game.view.score).toBe(2 * locked.rowsDropped);
    expect(types(events).filter((t) => t !== 'settled')).toEqual(['locked', 'spawned']);
    const filled = new Set(ghost.map(key));
    game.view.cells.forEach((color, index) => {
      expect(color !== null).toBe(filled.has(`${index % BOARD_COLS},${Math.floor(index / BOARD_COLS)}`));
    });
    expect(isSettled(game.view.cells)).toBe(true);
    expect(game.view.active).not.toBeNull();
    expect(game.view.next).not.toBe(next);
  });

  it('shows the ghost after individual settling, and reports that settling as moves', () => {
    // A pillar under the left end of the piece: the rigid landing hangs, the ghost does not.
    const game = play(['...c.....', '...c.....', '...c.....'], { seed: 1, pieceLimit: 30, target: 99 });
    for (let guard = 0; guard < 30; guard++) {
      game.drainEvents();
      const ghost = game.view.ghost!;
      game.apply('drop');
      const events = game.drainEvents();
      const locked = ofType(events, 'locked')[0]!;
      const settled = ofType(events, 'settled')[0];
      const rest = new Map(locked.cells.map((c) => [key(c), c]));
      for (const move of settled?.moves ?? []) {
        expect(rest.has(key(move.from))).toBe(true);
        expect(move.to.col).toBe(move.from.col);
        expect(move.to.row).toBeGreaterThan(move.from.row);
        rest.delete(key(move.from));
        rest.set(key(move.to), { ...move.to, color: move.color });
      }
      expect([...rest.keys()].sort()).toEqual(ghost.map(key).sort());
      if (settled !== undefined) return;
      resolve(game);
      if (game.view.phase !== 'falling') break;
    }
    throw new Error('no piece ever settled tile by tile');
  });
});

describe('activation', () => {
  it('lights a path of five or more, removes it after the window and ends the challenge', () => {
    const game = play(['...ttt...', '..tttt...'].slice(1), { target: 1 });
    game.drainEvents();
    const size = 4 + game.view.active!.length;
    game.apply('drop');
    const landedOn = new Set(game.view.cells.map((c, i) => (c === null ? '' : `${i % BOARD_COLS},${Math.floor(i / BOARD_COLS)}`)));
    let events = game.drainEvents();
    const rowsDropped = ofType(events, 'locked')[0]!.rowsDropped;
    expect(types(events).filter((t) => t !== 'settled')).toEqual(['locked', 'activated']);
    const activated = ofType(events, 'activated')[0]!;
    expect(activated.chain).toBe(1);
    expect(activated.groups).toHaveLength(1);
    expect(activated.groups[0]!.cells).toHaveLength(size);
    expect(activated.groups[0]!.links).toHaveLength(size - 1);
    expect(activated.points).toBe(pathPoints(size));
    // The light starts on a tile of the piece that just landed.
    const start = activated.groups[0]!.cells[0]!;
    expect(start.row).toBeLessThan(14);
    expect(landedOn.has(key(start))).toBe(true);

    expect(game.view.phase).toBe('resolving');
    expect(game.view.active).toBeNull();
    expect(game.view.ghost).toBeNull();
    expect(game.view.activating).toBe(activated.groups);
    expect(game.view.chain).toBe(1);
    expect(game.view.cells.filter((c) => c !== null)).toHaveLength(size);
    for (const command of ['left', 'rotateCw', 'drop', 'swap', 'continue'] as const) game.apply(command);
    for (let i = 0; i < ACTIVATION_TICKS - 1; i++) game.tick();
    expect(game.drainEvents()).toEqual([]);
    expect(game.view.phase).toBe('resolving');

    game.tick();
    events = game.drainEvents();
    expect(types(events)).toEqual(['removed', 'chainEnded', 'goalProgress', 'over']);
    expect(ofType(events, 'removed')[0]!.cells).toHaveLength(size);
    expect(ofType(events, 'chainEnded')[0]).toEqual({ type: 'chainEnded', length: 1, points: pathPoints(size) });
    expect(ofType(events, 'goalProgress')[0]!.goal).toEqual({ kind: 'paths', target: 1, progress: 1 });
    expect(events.at(-1)).toMatchObject({ type: 'over', outcome: 'challengeWon', stage: 1 });
    expect(game.view).toMatchObject({ phase: 'over', outcome: 'challengeWon', chain: 1, piecesLeft: 9 });
    expect(game.view.activating).toEqual([]);
    expect(game.view.cells.every((c) => c === null)).toBe(true);
    expect(game.view.score).toBe(pathPoints(size) + 2 * rowsDropped);
  });

  it('chains: tiles that fall into a new path raise the chain and the multiplier', () => {
    // Clearing the teal row lets the two corals above it fall next to the three on the left.
    const game = play(['...cc....', 'ccctttt..'], { kind: 'chain', target: 2 });
    game.drainEvents();
    const size = 4 + game.view.active!.length;
    game.apply('right');
    game.apply('right');
    game.apply('drop');
    const events = game.drainEvents();
    const ticks = resolve(game);
    events.push(...game.drainEvents());
    // The piece's own tiles may settle right after the lock; that event is optional.
    if (events[3]!.type === 'settled') events.splice(3, 1);
    expect(types(events).filter((t) => t !== 'moved')).toEqual([
      'locked', 'activated', 'removed', 'settled', 'activated', 'removed', 'chainEnded', 'goalProgress', 'over',
    ]);
    expect(ticks).toBe(ACTIVATION_TICKS + COLLAPSE_TICKS + ACTIVATION_TICKS);
    const [first, second] = ofType(events, 'activated');
    expect(first).toMatchObject({ chain: 1, points: pathPoints(size) });
    expect(second).toMatchObject({ chain: 2, points: pathPoints(5) * 1.5 });
    expect(second!.groups[0]!.color).toBe('coral');
    // The second light starts on a tile that just fell.
    expect(ofType(events, 'settled')[0]!.moves.map((m) => key(m.to))).toContain(key(second!.groups[0]!.cells[0]!));
    expect(ofType(events, 'chainEnded')[0]).toMatchObject({ length: 2, points: pathPoints(size) + 600 });
    expect(game.view).toMatchObject({ outcome: 'challengeWon', chain: 2 });
    expect(game.view.goal.progress).toBe(2);
  });

  it('counts tiles and score goals and clamps progress to the target', () => {
    const tiles = play(['..tttt...'], { kind: 'tiles', target: 6 });
    tiles.apply('drop');
    resolve(tiles);
    expect(tiles.view.goal).toEqual({ kind: 'tiles', target: 6, progress: 6 });
    expect(tiles.view.outcome).toBe('challengeWon');

    const score = play(['..tttt...'], { kind: 'score', target: 100000 });
    score.apply('drop');
    resolve(score);
    expect(score.view.goal.progress).toBe(score.view.score);
    expect(score.view.phase).toBe('falling');
  });
});

describe('challenge end', () => {
  it('fails when the pieces run out before the goal', () => {
    const game = play(['c........'], { pieceLimit: 2, target: 5 });
    game.drainEvents();
    game.apply('left');
    game.apply('drop');
    expect(game.view).toMatchObject({ phase: 'falling', piecesLeft: 1 });
    game.apply('right');
    game.apply('right');
    game.apply('drop');
    resolve(game);
    const events = game.drainEvents();
    expect(events.at(-1)).toMatchObject({ type: 'over', outcome: 'challengeFailed' });
    expect(game.view).toMatchObject({ phase: 'over', outcome: 'challengeFailed', piecesLeft: 0, active: null });
    game.apply('drop');
    game.tick();
    expect(game.drainEvents()).toEqual([]);
  });

  it('fails when the next piece has no room, even with pieces left', () => {
    // Full rows up to just below the spawn area, in colours the pieces do not have.
    const wall = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 'cccciiiic' : 'llllaaaal'));
    for (let seed = 1; seed <= 10; seed++) {
      const game = play(wall, { colors: ['teal'], pieceLimit: 30, target: 99, seed });
      for (let i = 0; i < 30 && game.view.phase === 'falling'; i++) {
        game.apply('drop');
        resolve(game);
      }
      expect(game.view).toMatchObject({ phase: 'over', outcome: 'challengeFailed' });
      expect(game.view.piecesLeft).toBeGreaterThan(20);
    }
  });
});

describe('endless end', () => {
  it('is over with outcome blocked when the spawn cells are taken', () => {
    // Narrow stacks under the spawn point; seeds where chance never clears the way.
    for (const seed of [1, 2, 3]) {
      const game = endless(seed);
      let drops = 0;
      while (game.view.phase !== 'over' && drops < 400) {
        if (game.view.phase === 'stageComplete') game.apply('continue');
        game.apply('rotateCw');
        game.apply('drop');
        resolve(game);
        drops++;
      }
      const events = game.drainEvents();
      expect(game.view).toMatchObject({ phase: 'over', outcome: 'blocked', active: null, ghost: null });
      expect(events.at(-1)).toEqual({ type: 'over', outcome: 'blocked', score: game.view.score, stage: game.view.stage });
      const view = game.view;
      game.apply('left');
      game.apply('continue');
      game.tick();
      expect(game.drainEvents()).toEqual([]);
      expect(game.view).toBe(view);
    }
  });
});
