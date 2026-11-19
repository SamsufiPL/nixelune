import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/game/game';
import { stageBonus } from '../../src/game/scoring';
import { stageDropIntervalMs, stageGoal } from '../../src/game/stages';
import type { GameEvent } from '../../src/game/types';
import { finishResolving, greedyPolicy } from '../../tools/bot';
import { ofType, types } from './helpers';

describe('endless stages', () => {
  it('completes a stage, waits for continue, then starts the next one on the same board', () => {
    const game = createGame({ seed: 21, mode: { kind: 'endless' } });
    const events: GameEvent[] = game.drainEvents();
    let progressSeen = 0;
    while (game.view.phase !== 'stageComplete') {
      for (const command of greedyPolicy(game.view)) game.apply(command);
      finishResolving(game);
      const batch = game.drainEvents();
      for (const e of ofType(batch, 'goalProgress')) {
        expect(e.goal.kind).toBe('paths');
        expect(e.goal.progress).toBeGreaterThan(progressSeen);
        expect(e.goal).toBe(game.view.goal);
        progressSeen = e.goal.progress;
      }
      events.push(...batch);
      expect(game.view.phase).not.toBe('over');
    }
    const completed = events.at(-1)!;
    expect(completed).toEqual({ type: 'stageCompleted', stage: 1, bonus: stageBonus(1) });
    expect(events.at(-2)!.type).toBe('goalProgress');
    expect(game.view.goal).toEqual({ kind: 'paths', target: 8, progress: 8 });
    expect(game.view.active).toBeNull();
    const earned = ofType(events, 'activated').reduce((sum, e) => sum + e.points, 0)
      + ofType(events, 'locked').reduce((sum, e) => sum + 2 * e.rowsDropped, 0);
    expect(game.view.score).toBe(earned + stageBonus(1));

    // Only 'continue' is accepted here.
    const waiting = game.view;
    for (const command of ['left', 'right', 'rotateCw', 'rotateCcw', 'drop', 'swap'] as const) game.apply(command);
    for (let i = 0; i < 200; i++) game.tick();
    expect(game.drainEvents()).toEqual([]);
    expect(game.view).toBe(waiting);

    const cells = game.view.cells;
    const score = game.view.score;
    game.apply('continue');
    expect(types(game.drainEvents())).toEqual(['stageStarted', 'spawned']);
    expect(game.view).toMatchObject({ phase: 'falling', stage: 2, score, dropIntervalMs: stageDropIntervalMs(2) });
    expect(game.view.goal).toEqual({ ...stageGoal(2), progress: 0 });
    expect(game.view.cells).toBe(cells);
    expect(game.view.dropIntervalMs).toBeLessThan(waiting.dropIntervalMs);
    game.apply('continue');
    expect(game.drainEvents()).toEqual([]);
  });

  it('measures a score goal from the start of its stage, without the stage bonus', () => {
    const game = createGame({ seed: 22, mode: { kind: 'endless' } });
    let base = 0;
    for (let guard = 0; guard < 2000 && game.view.stage <= 3; guard++) {
      if (game.view.phase === 'stageComplete') {
        game.apply('continue');
        if (game.view.stage === 3) base = game.view.score;
        continue;
      }
      for (const command of greedyPolicy(game.view)) game.apply(command);
      finishResolving(game);
      if (game.view.stage === 3 && game.view.phase === 'falling') {
        expect(game.view.goal.kind).toBe('score');
        expect(game.view.goal.progress).toBe(game.view.score - base);
      }
    }
    expect(game.view.stage).toBe(4);
  });
});
