import { describe, expect, it } from 'vitest';
import { stageDropIntervalMs, stageGoal, stageMixedShare } from '../../src/game/stages';
import { MIN_DROP_MS, MIXED_FIRST_STAGE, MIXED_SHARE_MAX, STAGE_BASE_DROP_MS, STAGE_CREEP_GRACE_PIECES, STAGE_GOAL_CYCLE } from '../../src/game/tuning';
import type { GoalKind } from '../../src/game/types';

describe('stage goals', () => {
  it('cycle through all four kinds', () => {
    expect([...STAGE_GOAL_CYCLE].sort()).toEqual(['chain', 'paths', 'score', 'tiles']);
    for (let stage = 1; stage <= 12; stage++) {
      expect(stageGoal(stage).kind).toBe(STAGE_GOAL_CYCLE[(stage - 1) % 4]);
    }
  });

  it('start with the documented targets', () => {
    expect([1, 2, 3, 4].map(stageGoal)).toEqual([
      { kind: 'paths', target: 8 },
      { kind: 'tiles', target: 50 },
      { kind: 'score', target: 5000 },
      { kind: 'chain', target: 2 },
    ]);
  });

  it('grow slowly, never shrink, stay whole numbers and are capped', () => {
    const last = new Map<GoalKind, number>();
    for (let stage = 1; stage <= 400; stage++) {
      const goal = stageGoal(stage);
      expect(Number.isInteger(goal.target)).toBe(true);
      expect(goal.target).toBeGreaterThanOrEqual(last.get(goal.kind) ?? 1);
      last.set(goal.kind, goal.target);
    }
    expect(stageGoal(5).target).toBeGreaterThan(stageGoal(1).target);
    expect(stageGoal(400)).toEqual({ kind: 'chain', target: 3 });
    expect(stageGoal(397)).toEqual(stageGoal(393));
  });
});

describe('stage gravity', () => {
  it('starts calm, gets faster every stage and stops at the floor', () => {
    expect(stageDropIntervalMs(1)).toBe(STAGE_BASE_DROP_MS);
    for (let stage = 1; stage < 60; stage++) {
      expect(stageDropIntervalMs(stage + 1)).toBeLessThanOrEqual(stageDropIntervalMs(stage));
      expect(stageDropIntervalMs(stage)).toBeGreaterThanOrEqual(MIN_DROP_MS);
    }
    expect(stageDropIntervalMs(2)).toBeLessThan(stageDropIntervalMs(1));
    expect(stageDropIntervalMs(60)).toBe(MIN_DROP_MS);
  });
});

describe('gravity creep inside a stage', () => {
  it('leaves normal stages alone and then speeds up piece by piece down to the floor', () => {
    for (const stage of [1, 4, 12]) {
      const base = stageDropIntervalMs(stage);
      expect(stageDropIntervalMs(stage, 0)).toBe(base);
      expect(stageDropIntervalMs(stage, STAGE_CREEP_GRACE_PIECES)).toBe(base);
      expect(stageDropIntervalMs(stage, STAGE_CREEP_GRACE_PIECES + 1)).toBeLessThan(base);
      for (let pieces = 0; pieces < 600; pieces++) {
        expect(stageDropIntervalMs(stage, pieces + 1)).toBeLessThanOrEqual(stageDropIntervalMs(stage, pieces));
      }
      expect(stageDropIntervalMs(stage, 600)).toBe(MIN_DROP_MS);
    }
    // Slow: after 20 pieces over the grace the interval is still above 70%.
    expect(stageDropIntervalMs(1, STAGE_CREEP_GRACE_PIECES + 20)).toBeGreaterThan(0.7 * STAGE_BASE_DROP_MS);
  });
});

describe('two-colour share', () => {
  it('is zero in the first stages, then ramps up to the cap and stays there', () => {
    expect(MIXED_FIRST_STAGE).toBeGreaterThanOrEqual(3);
    for (let stage = 1; stage < MIXED_FIRST_STAGE; stage++) expect(stageMixedShare(stage)).toBe(0);
    expect(stageMixedShare(MIXED_FIRST_STAGE)).toBeGreaterThan(0);
    expect(stageMixedShare(MIXED_FIRST_STAGE)).toBeLessThan(MIXED_SHARE_MAX);
    for (let stage = 1; stage < 100; stage++) {
      expect(stageMixedShare(stage + 1)).toBeGreaterThanOrEqual(stageMixedShare(stage));
      expect(stageMixedShare(stage)).toBeLessThanOrEqual(MIXED_SHARE_MAX);
    }
    expect(stageMixedShare(100)).toBe(MIXED_SHARE_MAX);
    expect(MIXED_SHARE_MAX).toBeLessThanOrEqual(1);
  });
});
