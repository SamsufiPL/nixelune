import { describe, expect, it } from 'vitest';
import { findGroups, isSettled, parsePrefill } from '../../src/game/board';
import { CHALLENGES } from '../../src/game/challenges';
import { createGame } from '../../src/game/game';
import { ACTIVATION_THRESHOLD, TILE_COLORS } from '../../src/game/types';

describe('shipped challenges', () => {
  it('are twelve with the stable ids c01..c12', () => {
    expect(CHALLENGES.map((c) => c.id)).toEqual([
      'c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08', 'c09', 'c10', 'c11', 'c12',
    ]);
  });

  it('have distinct seeds, valid colours, positive goals and limits', () => {
    expect(new Set(CHALLENGES.map((c) => c.seed)).size).toBe(CHALLENGES.length);
    for (const def of CHALLENGES) {
      expect(def.colors.length).toBeGreaterThanOrEqual(2);
      expect(new Set(def.colors).size).toBe(def.colors.length);
      for (const color of def.colors) expect(TILE_COLORS).toContain(color);
      expect(def.goal.target).toBeGreaterThan(0);
      expect(def.pieceLimit).toBeGreaterThan(0);
    }
  });

  it('start from settled boards without a ready path and with room to spawn', () => {
    for (const def of CHALLENGES) {
      const board = parsePrefill(def.prefill);
      expect(isSettled(board), def.id).toBe(true);
      expect(findGroups(board, ACTIVATION_THRESHOLD), def.id).toEqual([]);
      expect(board.some((c) => c !== null), def.id).toBe(true);
      const game = createGame({ seed: 0, mode: { kind: 'challenge', challenge: def } });
      expect(game.view.phase, def.id).toBe('falling');
      expect(game.view.piecesLeft).toBe(def.pieceLimit);
      expect(game.view.goal).toEqual({ ...def.goal, progress: 0 });
    }
  });

  it('use every goal kind and get harder: more colours and bigger boards later', () => {
    expect(new Set(CHALLENGES.map((c) => c.goal.kind)).size).toBe(4);
    const tiles = CHALLENGES.map((c) => parsePrefill(c.prefill).filter((t) => t !== null).length);
    for (let i = 1; i < CHALLENGES.length; i++) {
      expect(CHALLENGES[i]!.colors.length).toBeGreaterThanOrEqual(CHALLENGES[i - 1]!.colors.length);
    }
    expect(tiles[11]).toBeGreaterThan(tiles[5]!);
    expect(tiles[5]).toBeGreaterThan(tiles[0]!);
  });
});
