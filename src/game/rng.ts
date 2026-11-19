/** Seeded pseudo-random generator (mulberry32). The only source of gameplay randomness. */
export interface Rng {
  /** Uniform float in [0, 1). */
  float(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const float = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { float, int: (n) => Math.floor(float() * n) };
}

/** Independent stream seed derived from a base seed and a stream number. */
export function deriveSeed(seed: number, stream: number): number {
  let h = (seed >>> 0) ^ Math.imul(stream + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Fisher-Yates shuffle in place. */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const a = items[i] as T;
    items[i] = items[j] as T;
    items[j] = a;
  }
  return items;
}
