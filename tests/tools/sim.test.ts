import { describe, expect, it } from 'vitest';
import { createBoard, isSettled, parsePrefill } from '../../src/game/board';
import { createGame } from '../../src/game/game';
import { makePiece, SHAPES } from '../../src/game/pieces';
import { createRng } from '../../src/game/rng';
import { pathPoints, stageBonus } from '../../src/game/scoring';
import { finishResolving, pieceAtSpawn } from '../../tools/bot';
import { enumeratePlacements, resolveMove } from '../../tools/sim';

describe('resolveMove', () => {
  it('resolves a whole chain at once with the game scoring', () => {
    const board = parsePrefill(['...cc....', 'ccctttt..']);
    const result = resolveMove(board, [{ col: 7, row: 14, color: 'teal' }], 10);
    expect(result).toMatchObject({ chain: 2, paths: 2, tiles: 10, points: 20 + pathPoints(5) + pathPoints(5) * 1.5 });
    expect(result.board.every((c) => c === null)).toBe(true);
    expect(board.filter((c) => c !== null)).toHaveLength(9);
  });

  it('leaves a board without paths untouched apart from the new tiles', () => {
    const result = resolveMove(createBoard(), [{ col: 0, row: 14, color: 'ice' }]);
    expect(result).toMatchObject({ chain: 0, paths: 0, tiles: 0, points: 0 });
    expect(result.board.filter((c) => c !== null)).toHaveLength(1);
  });
});

describe('enumeratePlacements', () => {
  it('lists distinct placements across the whole width, each ending with a drop', () => {
    for (const shape of SHAPES) {
      const placements = enumeratePlacements(createBoard(), makePiece(shape, 'teal'));
      expect(placements.length).toBeGreaterThanOrEqual(15);
      const columns = new Set(placements.flatMap((p) => p.landing.restCells.map((c) => c.col)));
      expect(columns.size).toBe(9);
      for (const p of placements) expect(p.commands.at(-1)).toBe('drop');
    }
  });

  it('returns nothing when the piece cannot spawn', () => {
    expect(enumeratePlacements(createBoard().fill('coral'), makePiece(SHAPES[0]!, 'teal'))).toEqual([]);
  });

  it('predicts exactly what the real game does with the same commands', () => {
    for (const seed of [1, 2, 3, 4]) {
      const game = createGame({ seed, mode: { kind: 'endless' } });
      const rng = createRng(seed + 7);
      for (let i = 0; i < 150 && game.view.phase !== 'over'; i++) {
        if (game.view.phase === 'stageComplete') game.apply('continue');
        const before = game.view;
        const placements = enumeratePlacements(before.cells, pieceAtSpawn(before));
        expect(placements.length).toBeGreaterThan(0);
        const pick = placements[rng.int(placements.length)]!;
        const predicted = resolveMove(before.cells, pick.landing.restCells, pick.landing.rowsDropped);
        for (const command of pick.commands) game.apply(command);
        finishResolving(game);
        const after = game.view;
        expect(game.drainEvents().filter((e) => e.type === 'blocked')).toEqual([]);
        expect(after.cells).toEqual(predicted.board);
        const bonus = after.phase === 'stageComplete' ? stageBonus(after.stage) : 0;
        expect(after.score - before.score - bonus).toBe(predicted.points);
        expect(isSettled(after.cells)).toBe(true);
      }
    }
  });
});
