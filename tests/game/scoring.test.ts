import { describe, expect, it } from 'vitest';
import { activationPoints, chainMultiplier, hardDropPoints, pathPoints, stageBonus } from '../../src/game/scoring';

describe('scoring', () => {
  it('pays 100 per tile above four plus 60 per tile', () => {
    expect(pathPoints(5)).toBe(400);
    expect(pathPoints(6)).toBe(560);
    expect(pathPoints(9)).toBe(1040);
  });

  it('multiplies by 1 + 0.5 per further chain step', () => {
    expect([1, 2, 3, 4].map(chainMultiplier)).toEqual([1, 1.5, 2, 2.5]);
    expect(activationPoints([5], 1)).toBe(400);
    expect(activationPoints([5, 6], 1)).toBe(960);
    expect(activationPoints([5, 6], 2)).toBe(1440);
    expect(activationPoints([7], 3)).toBe(1440);
  });

  it('pays 2 points per hard-dropped row', () => {
    expect(hardDropPoints(0)).toBe(0);
    expect(hardDropPoints(11)).toBe(22);
  });

  it('gives a growing stage bonus, 2 400 for stage 4 as in the mockup', () => {
    expect(stageBonus(4)).toBe(2400);
    expect(stageBonus(1)).toBeGreaterThan(0);
    for (let s = 1; s < 30; s++) expect(stageBonus(s + 1)).toBeGreaterThan(stageBonus(s));
  });
});
