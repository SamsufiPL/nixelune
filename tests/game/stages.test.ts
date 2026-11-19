import { describe, expect, it } from 'vitest';
import { stageDropIntervalMs, stageGoal } from '../../src/game/stages';
import { MIN_DROP_MS, STAGE_BASE_DROP_MS, STAGE_GOAL_CYCLE } from '../../src/game/tuning';
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
