import { describe, expect, it } from 'vitest';
import { TILE_COLORS } from '../../src/game/types';
import { SKIN_ID_PATTERN } from '../../src/platform/types';
import { squashAt } from '../../src/render/boardRenderer';
import { backOut, createVisualRandom, FxSystem } from '../../src/render/fx';
import { FX_LIMITS, lightDelay, resolveTiming, TILE_STATES, type BurstSpec, type EffectsSkin, type Skin } from '../../src/render/skin';
import { DEFAULT_SKIN, SKINS } from '../../src/render/skins/index';
import { TileSprites } from '../../src/render/sprites';

/** Every registered skin must pass these; a new skin is covered by adding its registry line. */
describe('skin registry', () => {
  it('has the default skin', () => {
    expect(Object.keys(SKINS)).toContain(DEFAULT_SKIN);
  });

  for (const id of Object.keys(SKINS)) {
    describe(id, () => {
      const load = async (): Promise<Skin> => (await SKINS[id]!.load()).default;

      it('has a well-formed id that matches its registry key, and a name in both languages', async () => {
        expect(id).toMatch(SKIN_ID_PATTERN);
        expect((await load()).id).toBe(id);
        expect(SKINS[id]!.name.pl.trim()).not.toBe('');
        expect(SKINS[id]!.name.en.trim()).not.toBe('');
      });

      it('tells every colour apart by a different, named mark', async () => {
        const marks = (await load()).meta.marks;
        const shapes = TILE_COLORS.map((color) => marks[color].shape);
        expect(new Set(shapes).size).toBe(TILE_COLORS.length);
        for (const color of TILE_COLORS) {
          expect(marks[color].name.pl.trim()).not.toBe('');
          expect(marks[color].name.en.trim()).not.toBe('');
        }
      });

      it('keeps overflow and bed padding within sane bounds', async () => {
        const skin = await load();
        for (const value of [skin.tile.overflow.x, skin.tile.overflow.top, skin.tile.overflow.bottom]) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
        expect(skin.bed.pad).toBeGreaterThanOrEqual(0.3);
        expect(skin.bed.pad).toBeLessThanOrEqual(1.5);
        expect(['topDown', 'bottomUp']).toContain(skin.tile.rowOrder);
      });

      it('fits its light-up into the simulation window and keeps motion short', async () => {
        const skin = await load();
        const timing = resolveTiming(skin.effects.timing);
        // Declared values must already be inside the limits: clamping is a safety net.
        expect(skin.effects.timing.activation).toBeLessThanOrEqual(FX_LIMITS.maxActivation);
        expect(skin.effects.timing.step).toBeLessThanOrEqual(FX_LIMITS.maxStep);
        expect(skin.effects.timing.hardDrop).toBeLessThanOrEqual(FX_LIMITS.maxStep);
        expect(skin.effects.timing.fallMax).toBeLessThanOrEqual(FX_LIMITS.maxFall);
        expect(timing.activation).toBeGreaterThanOrEqual(200);
        expect(lightDelay(6, 7, timing) + timing.lightUp).toBeLessThanOrEqual(FX_LIMITS.maxActivation);
      });

      it('returns stable particle colour arrays', async () => {
        const effects = (await load()).effects;
        for (const color of [...TILE_COLORS, null]) {
          expect(effects.particleColors(color)).toBe(effects.particleColors(color));
        }
      });

      it('has a system bar colour', async () => {
        expect((await load()).ui.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  }
});

describe('timing limits', () => {
  it('clamps what a skin asks for', () => {
    const timing = resolveTiming({
      step: 500,
      spawn: 5000,
      hardDrop: 300,
      fallBase: 900,
      fallPerRow: 900,
      fallMax: 900,
      lightUp: 900,
      activation: 900,
      pop: 5000,
      popStagger: 5000,
    });
    expect(timing.step).toBe(FX_LIMITS.maxStep);
    expect(timing.hardDrop).toBe(FX_LIMITS.maxStep);
    expect(timing.fallMax).toBe(FX_LIMITS.maxFall);
    expect(timing.activation).toBe(FX_LIMITS.maxActivation);
    expect(timing.lightUp).toBeLessThanOrEqual(timing.activation);
    expect(timing.pop).toBe(FX_LIMITS.maxPop);
    expect(timing.popStagger).toBe(FX_LIMITS.maxPopStagger);
    expect(resolveTiming({ ...timing, step: Number.NaN }).step).toBe(0);
  });

  it('has six tile states', () => {
    expect([...TILE_STATES].sort()).toEqual(['active', 'ghost', 'hint1', 'hint2', 'lit', 'normal']);
  });
});

describe('curves', () => {
  it('squash starts and ends at rest and dips in between', () => {
    expect(squashAt(0, 0.2)).toBe(0);
    expect(squashAt(1, 0.2)).toBe(0);
    let min = 0;
    let max = 0;
    for (let p = 0.01; p < 1; p += 0.01) {
      const v = squashAt(p, 0.2);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeLessThan(-0.1);
    expect(min).toBeGreaterThan(-0.35);
    expect(max).toBeGreaterThan(0); // a small stretch on the way back
    expect(max).toBeLessThan(0.1);
  });

  it('back-out overshoots once and lands on 1', () => {
    expect(backOut(0)).toBeCloseTo(0);
    expect(backOut(1)).toBe(1);
    expect(backOut(0.7)).toBeGreaterThan(1);
  });

  it('visual randomness is seeded and in range', () => {
    const a = createVisualRandom(1);
    const b = createVisualRandom(1);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(createVisualRandom(2)()).not.toBe(createVisualRandom(1)());
  });
});

/** A document that hands out inert canvases, enough for pool logic without a browser. */
const fakeDocument = {
  createElement: () => ({ width: 0, height: 0, getContext: () => null }),
} as unknown as Document;

const COLORS = ['#fff'] as const;
const effects = { particleColors: () => COLORS } as unknown as EffectsSkin;
const burst = (count: number, life = 300): BurstSpec => ({ count, shape: 'dot', size: [0.2, 0.2], speed: [1, 2], life: [life, life] });

describe('particle pool', () => {
  it('caps a burst and the number of live particles', () => {
    const fx = new FxSystem(effects, fakeDocument);
    fx.configure(effects, 20, 1);
    expect(fx.burst(burst(500), 0, 0, 'teal')).toBe(FX_LIMITS.maxBurst);
    for (let i = 0; i < 40; i++) fx.burst(burst(24), 0, 0, 'teal');
    expect(fx.liveParticles).toBe(FX_LIMITS.maxParticles);
    expect(fx.burst(burst(5), 0, 0, 'teal')).toBe(0);
  });

  it('retires particles at the end of their life and honours the delay', () => {
    const fx = new FxSystem(effects, fakeDocument);
    fx.configure(effects, 20, 1);
    fx.burst(burst(10, 300), 0, 0, 'coral', 200);
    fx.burst(burst(6, 100), 0, 0, 'coral');
    fx.step(150);
    expect(fx.liveParticles).toBe(10); // the short-lived ones are gone, the delayed ones wait
    fx.step(300);
    expect(fx.liveParticles).toBe(10);
    fx.step(100);
    expect(fx.liveParticles).toBe(0);
    expect(fx.busy).toBe(false);
  });

  it('clamps particle life', () => {
    const fx = new FxSystem(effects, fakeDocument);
    fx.configure(effects, 20, 1);
    fx.burst(burst(3, 60_000), 0, 0, null);
    fx.step(FX_LIMITS.maxParticleLife + 1);
    expect(fx.liveParticles).toBe(0);
  });

  it('throws nothing when the skin has no colours for the tile', () => {
    const none = { particleColors: () => [] } as unknown as EffectsSkin;
    const fx = new FxSystem(none, fakeDocument);
    fx.configure(none, 20, 1);
    expect(fx.burst(burst(8), 0, 0, 'ice')).toBe(0);
  });

  it('clear drops everything', () => {
    const fx = new FxSystem(effects, fakeDocument);
    fx.configure(effects, 20, 1);
    fx.burst(burst(12), 0, 0, 'amber');
    fx.clear();
    expect(fx.liveParticles).toBe(0);
  });
});

describe('tile sprites', () => {
  it('sizes the sprite from the cell plus the declared overflow, on whole device pixels', () => {
    const tile = { overflow: { x: 0.1, top: 0.05, bottom: 0.4 }, rowOrder: 'topDown' as const, paint: () => undefined };
    const sprites = new TileSprites(tile, 20, { marks: true, highContrast: false, dpr: 2 }, fakeDocument);
    expect(sprites.originX).toBeCloseTo(22);
    expect(sprites.width).toBeCloseTo(44);
    expect(sprites.originY).toBeCloseTo(21);
    expect(sprites.height).toBeCloseTo(21 + 28);
    expect((sprites.width * 2) % 1).toBe(0);
  });

  it('paints each colour and state once', () => {
    let calls = 0;
    const tile = { overflow: { x: 0, top: 0, bottom: 0 }, rowOrder: 'topDown' as const, paint: () => void calls++ };
    const doc = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ setTransform() {} }) }) } as unknown as Document;
    const sprites = new TileSprites(tile, 20, { marks: true, highContrast: false, dpr: 1 }, doc);
    sprites.warm();
    sprites.warm();
    sprites.get('teal', 'lit');
    expect(calls).toBe(TILE_COLORS.length * TILE_STATES.length);
  });
});
