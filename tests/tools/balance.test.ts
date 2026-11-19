import { describe, expect, it } from 'vitest';
import { STAGE_BASE_DROP_MS } from '../../src/game/tuning';
import { BOARD_ROWS } from '../../src/game/types';
import { balanceReport, greedyRuns, median, randomRuns } from '../../tools/balance';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe('endless balance', () => {
  const greedy = greedyRuns(SEEDS, 400);

  it('a greedy bot is never blocked within its first 400 pieces and keeps the board low', () => {
    for (const run of greedy) {
      expect(run.outcome).toBeNull();
      expect(run.pieces).toBe(400);
      expect(run.tilesOnBoard).toBeLessThan(70);
      expect(run.score).toBeGreaterThan(50000);
    }
  });

  it('stage 1 takes a good player neither a moment nor an age', () => {
    // The greedy bot plays better than a person; at about 2.5-4 s per piece its
    // 12-30 pieces are 30 s to 2 min, a decent human lands in the 1-2 minute window.
    const stageOne = greedy.map((run) => run.piecesPerStage[0]!);
    expect(Math.min(...stageOne)).toBeGreaterThanOrEqual(12);
    expect(Math.max(...stageOne)).toBeLessThanOrEqual(30);
    // Falling the whole board at stage 1 gravity must not be the limiting factor.
    expect((STAGE_BASE_DROP_MS * BOARD_ROWS) / 1000).toBeLessThan(15);
  });

  it('stage 1 is untouched by two-colour pieces and the bot gets comfortably past stage 5', () => {
    // Same numbers as before decision D-14 (single-colour stages 1-2, unchanged streams).
    expect(greedy.map((run) => run.piecesPerStage[0])).toEqual([18, 18, 17, 17, 18, 18, 18, 18]);
    for (const run of greedy) expect(run.stage).toBeGreaterThan(10);
  });

  it('no stage is a wall or a formality for the greedy bot in the first twelve', () => {
    for (const run of greedy) {
      expect(run.stage).toBeGreaterThan(12);
      for (const pieces of run.piecesPerStage.slice(0, 12)) {
        expect(pieces).toBeGreaterThanOrEqual(2);
        expect(pieces).toBeLessThanOrEqual(120);
      }
    }
  });

  it('a random-placement bot always loses, far earlier than the greedy bot plays', () => {
    const random = randomRuns([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 5000);
    for (const run of random) {
      expect(run.outcome).toBe('blocked');
      expect(run.pieces).toBeGreaterThanOrEqual(8);
      expect(run.pieces).toBeLessThan(5000);
    }
    expect(median(random.map((run) => run.pieces))).toBeLessThan(150);
    // Two-colour pieces cut the long lucky runs (single-colour only: up to 400 pieces on these seeds).
    expect(Math.max(...random.map((run) => run.pieces))).toBeLessThan(300);
  });
});

describe('balance report', () => {
  it('covers endless and every challenge', () => {
    const report = balanceReport();
    if (process.env['BALANCE_REPORT']) console.log(`\n${report}\n`);
    expect(report).toContain('ENDLESS, greedy bot');
    expect(report).toContain('c12');
    expect(report).not.toContain('NOT WON');
  }, 60000);
});
