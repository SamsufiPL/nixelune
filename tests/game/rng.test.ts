import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed, shuffle } from '../../src/game/rng';

describe('seeded generator', () => {
  it('repeats the same sequence for the same seed and differs for another', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = Array.from({ length: 50 }, () => a.float());
    expect(Array.from({ length: 50 }, () => b.float())).toEqual(seqA);
    expect(Array.from({ length: 50 }, () => c.float())).not.toEqual(seqA);
  });

  it('stays in range and covers all integers roughly evenly', () => {
    const rng = createRng(1);
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 10000; i++) {
      const f = rng.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      counts[rng.int(5)]!++;
    }
    for (const n of counts) expect(n).toBeGreaterThan(1800);
  });

  it('derives distinct stream seeds and shuffles as a permutation', () => {
    expect(deriveSeed(5, 1)).not.toBe(deriveSeed(5, 2));
    expect(deriveSeed(5, 1)).toBe(deriveSeed(5, 1));
    const items = shuffle([1, 2, 3, 4, 5, 6, 7, 8], createRng(9));
    expect([...items].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
