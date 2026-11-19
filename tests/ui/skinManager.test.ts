import { describe, expect, it } from 'vitest';
import type { Skin } from '../../src/render/skin';
import { ambientInterval } from '../../src/ui/backdrop';
import { percentile, perfEnabled } from '../../src/ui/perfProbe';
import { createSkinManager, resolveSkinId, skinFromSearch, type SkinRegistry } from '../../src/ui/skinManager';

const skin = (id: string): Skin => ({ id }) as unknown as Skin;
const entry = (id: string, fail = false) => ({
  name: { pl: id, en: id },
  load: () => (fail ? Promise.reject(new Error('no')) : Promise.resolve({ default: skin(id) })),
});
const registry: SkinRegistry = { kit: entry('kit'), demo: entry('demo'), broken: entry('broken', true) };

describe('skin choice', () => {
  it('prefers the URL, then the save, then the default', () => {
    expect(resolveSkinId('demo', 'kit', registry, 'kit')).toBe('demo');
    expect(resolveSkinId(null, 'demo', registry, 'kit')).toBe('demo');
    expect(resolveSkinId(null, null, registry, 'kit')).toBe('kit');
    expect(resolveSkinId(undefined, 'default', registry, 'demo')).toBe('demo');
  });

  it('skips ids that are not registered', () => {
    expect(resolveSkinId('gone', 'demo', registry, 'kit')).toBe('demo');
    expect(resolveSkinId('gone', 'also-gone', registry, 'kit')).toBe('kit');
    expect(resolveSkinId('__proto__', 'constructor', registry, 'kit')).toBe('kit');
    expect(resolveSkinId(null, null, registry, 'missing-default')).toBe('kit');
  });

  it('reads ?skin= from the address', () => {
    expect(skinFromSearch('?skin=demo&fps=1')).toBe('demo');
    expect(skinFromSearch('')).toBeNull();
  });
});

describe('skin manager', () => {
  it('loads the initial skin and switches live, notifying listeners', async () => {
    const manager = await createSkinManager('kit', registry);
    expect(manager.id).toBe('kit');
    expect(manager.choices.map((choice) => choice.id)).toEqual(['kit', 'demo', 'broken']);
    const seen: string[] = [];
    manager.onChange((next) => seen.push(next.id));
    expect(await manager.select('demo')).toBe(true);
    expect(manager.skin.id).toBe('demo');
    expect(seen).toEqual(['demo']);
    expect(await manager.select('demo')).toBe(true);
    expect(seen).toEqual(['demo']); // no change, no notification
  });

  it('keeps the current skin when the chosen one is unknown or fails to load', async () => {
    const manager = await createSkinManager('kit', registry);
    expect(await manager.select('nope')).toBe(false);
    expect(await manager.select('broken')).toBe(false);
    expect(manager.id).toBe('kit');
  });

  it('falls back to a skin that loads when the initial one does not', async () => {
    const manager = await createSkinManager('broken', { broken: entry('broken', true), demo: entry('demo') });
    expect(manager.id).toBe('demo');
  });

  it('the last of two quick choices wins', async () => {
    let release: (() => void) | undefined;
    const slow: SkinRegistry = {
      kit: entry('kit'),
      slow: { name: { pl: 's', en: 's' }, load: () => new Promise((resolve) => (release = () => resolve({ default: skin('slow') }))) },
      demo: entry('demo'),
    };
    const manager = await createSkinManager('kit', slow);
    const first = manager.select('slow');
    const second = manager.select('demo');
    release?.();
    expect(await second).toBe(true);
    expect(await first).toBe(false);
    expect(manager.id).toBe('demo');
  });
});

describe('helpers', () => {
  it('ambient rate is clamped to 1-30 fps', () => {
    expect(ambientInterval(20)).toBe(50);
    expect(ambientInterval(500)).toBeCloseTo(1000 / 30);
    expect(ambientInterval(0)).toBe(1000);
    expect(ambientInterval(Number.NaN)).toBe(100);
  });

  it('perf read-out is opt-in', () => {
    expect(perfEnabled('?fps=1')).toBe(true);
    expect(perfEnabled('?fps=0')).toBe(false);
    expect(perfEnabled('?skin=kit')).toBe(false);
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(percentile([], 0.95)).toBe(0);
  });
});
