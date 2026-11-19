// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/platform/types';
import { SAVE_KEYS, createFakeServices, createServices } from '../../src/services/index';
import { encodeSlot } from '../../src/services/save/envelope';
import { WebStorageStore } from '../../src/services/save/stores';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('createFakeServices', () => {
  it('returns a complete, independent graph each time', async () => {
    const first = createFakeServices();
    const second = createFakeServices();
    expect(first.isNative).toBe(false);
    expect(first.save).not.toBe(second.save);
    await first.save.update((draft) => {
      draft.bestScore = 5;
    });
    await second.save.load();
    expect(second.save.data.bestScore).toBe(0);
    expect(first.store.entries.has(SAVE_KEYS.slotA)).toBe(true);
    expect(second.store.entries.size).toBe(0);
  });

  it('has working fakes', () => {
    const services = createFakeServices();
    services.audio.play('land');
    services.haptics.fire('land');
    let paused = 0;
    services.lifecycle.onPause(() => {
      paused += 1;
    });
    services.lifecycle.emitPause();
    expect(services.audio.played).toEqual([{ sound: 'land', step: undefined }]);
    expect(services.haptics.fired).toEqual(['land']);
    expect(paused).toBe(1);
  });

  it('defaults to English and honours options', () => {
    expect(createFakeServices().i18n.language).toBe('en');
    expect(createFakeServices({ systemLanguages: ['pl-PL'] }).i18n.language).toBe('pl');
    expect(createFakeServices({ language: 'pl' }).i18n.language).toBe('pl');
    expect(createFakeServices({ isNative: true }).isNative).toBe(true);
    const custom = createFakeServices({ catalogues: { en: { k: 'v {n}' }, pl: { k: 'w {n}' } } });
    expect(custom.i18n.t('k', { n: 1 })).toBe('v 1');
  });
});

describe('createServices on the web', () => {
  it('builds web adapters and loads defaults', async () => {
    const services = await createServices();
    expect(services.isNative).toBe(false);
    expect(services.save.data.settings).toEqual(DEFAULT_SETTINGS);
    expect(() => {
      services.audio.play('move');
      services.haptics.fire('tick');
      services.lifecycle.exitApp();
    }).not.toThrow();
  });

  it('persists to localStorage and applies stored settings', async () => {
    const first = await createServices();
    await first.save.update((draft) => {
      draft.settings.language = 'pl';
      draft.bestScore = 77;
    });
    expect(localStorage.getItem(SAVE_KEYS.slotA)).not.toBeNull();
    const second = await createServices();
    expect(second.save.data.bestScore).toBe(77);
    expect(second.i18n.language).toBe('pl');
    expect(second.save).not.toBe(first.save);
  });

  it('does not throw on a corrupt stored save', async () => {
    localStorage.setItem(SAVE_KEYS.slotA, '{{{{');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const services = await createServices();
    expect(services.save.data.bestScore).toBe(0);
    expect(localStorage.getItem(SAVE_KEYS.corruptA)).toBe('{{{{');
  });
});

describe('WebStorageStore', () => {
  it('maps to Storage', async () => {
    const store = new WebStorageStore(localStorage);
    expect(await store.get('a')).toBeNull();
    await store.set('a', encodeSlot({ seq: 1, payload: '{}' }));
    expect(await store.get('a')).toBe(localStorage.getItem('a'));
    await store.remove('a');
    expect(localStorage.getItem('a')).toBeNull();
  });

  it('rejects when storage throws (quota), which the save service absorbs', async () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => {},
    } as unknown as Storage;
    await expect(new WebStorageStore(broken).set('a', 'b')).rejects.toThrow();
  });
});
