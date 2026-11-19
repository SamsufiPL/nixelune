import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/platform/types';
import type { SaveData } from '../../src/platform/types';
import type { Logger } from '../../src/services/log';
import { checksum, decodeSlot, encodeSlot, isNewerEnvelope } from '../../src/services/save/envelope';
import { SAVE_KEYS, VersionedSaveService } from '../../src/services/save/saveService';
import { SAVE_LIMITS, defaultSave, parseSave, sanitizeSave } from '../../src/services/save/schema';
import { MemoryStore } from '../../src/services/save/stores';

const quiet: Logger = () => {};

function sample(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, language: 'pl', soundVolume: 0.25, haptics: false },
    bestScore: 4200,
    bestStage: 7,
    challenges: { 'c-01': { completed: true, bestScore: 900 } },
    tutorialSeen: true,
    gamesPlayed: 12,
    ...overrides,
  };
}

function slot(seq: number, value: unknown): string {
  return encodeSlot({ seq, payload: JSON.stringify(value) });
}

/** Store whose behaviour can be bent per call. */
class TrickStore extends MemoryStore {
  failGets = false;
  failSets = false;
  /** Called before each set; return a replacement value to simulate a damaged write. */
  onSet: ((key: string, value: string) => string | undefined) | null = null;
  sets: string[] = [];

  override async get(key: string): Promise<string | null> {
    if (this.failGets) throw new Error('get failed');
    return super.get(key);
  }

  override async set(key: string, value: string): Promise<void> {
    if (this.failSets) throw new Error('set failed');
    this.sets.push(key);
    const replaced = this.onSet?.(key, value);
    return super.set(key, replaced ?? value);
  }
}

describe('slot envelope', () => {
  it('round-trips', () => {
    const raw = encodeSlot({ seq: 3, payload: '{"a":1}' });
    expect(decodeSlot(raw)).toEqual({ seq: 3, payload: '{"a":1}' });
  });

  it('rejects truncated, altered and foreign values', () => {
    const raw = encodeSlot({ seq: 3, payload: '{"a":1}' });
    expect(decodeSlot(raw.slice(0, raw.length - 4))).toBeNull();
    expect(decodeSlot(raw.replace('"a\\":1', '"a\\":2'))).toBeNull();
    expect(decodeSlot(raw.replace('"seq":3', '"seq":4'))).toBeNull();
    expect(decodeSlot('')).toBeNull();
    expect(decodeSlot('null')).toBeNull();
    expect(decodeSlot('[]')).toBeNull();
    expect(decodeSlot('{"f":1,"seq":0,"sum":"00000000","payload":""}')).toBeNull();
  });

  it('recognises an envelope format from the future', () => {
    expect(isNewerEnvelope('{"f":2,"whatever":true}')).toBe(true);
    expect(isNewerEnvelope(encodeSlot({ seq: 1, payload: '{}' }))).toBe(false);
    expect(isNewerEnvelope('garbage')).toBe(false);
  });

  it('checksum is stable and sensitive', () => {
    expect(checksum('')).toBe('811c9dc5');
    expect(checksum('a')).toBe('e40c292c');
    expect(checksum('ab')).not.toBe(checksum('ba'));
  });
});

describe('parseSave / sanitizeSave', () => {
  it('accepts a valid save unchanged', () => {
    const outcome = parseSave(sample());
    expect(outcome).toEqual({ kind: 'ok', data: sample(), repaired: false });
  });

  it('defaults are valid', () => {
    expect(parseSave(defaultSave())).toEqual({ kind: 'ok', data: defaultSave(), repaired: false });
    expect(defaultSave().settings).toEqual(DEFAULT_SETTINGS);
    expect(defaultSave().settings).not.toBe(DEFAULT_SETTINGS);
  });

  it('reports non-objects and bad versions as corrupt', () => {
    for (const value of [null, 5, 'x', [], {}, { version: '1' }, { version: 1.5 }, { version: -1 }, { version: Number.NaN }]) {
      expect(parseSave(value).kind, JSON.stringify(value)).toBe('corrupt');
    }
  });

  it('reports a newer version without touching it', () => {
    expect(parseSave({ ...sample(), version: 2 })).toEqual({ kind: 'newer', version: 2 });
  });

  it('has no migration for versions that never existed', () => {
    expect(parseSave({ ...sample(), version: 0 }).kind).toBe('corrupt');
  });

  it('migrates old versions step by step', () => {
    const migrations = {
      0: (old: Record<string, unknown>) => ({ ...old, version: 1, bestScore: old.best }),
      1: (old: Record<string, unknown>) => ({ ...old, version: 2, gamesPlayed: 99 }),
    };
    const { version: _version, bestScore: _bestScore, ...rest } = sample();
    const outcome = parseSave({ ...rest, version: 0, best: 77 }, migrations, 2);
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.data.bestScore).toBe(77);
    expect(outcome.data.gamesPlayed).toBe(99);
    expect(outcome.repaired).toBe(false);
  });

  it('treats a throwing migration as corrupt', () => {
    const migrations = {
      0: () => {
        throw new Error('bad');
      },
    };
    expect(parseSave({ version: 0 }, migrations).kind).toBe('corrupt');
  });

  it('replaces fields of the wrong type with defaults', () => {
    const { data, repaired } = sanitizeSave({
      version: 1,
      settings: { language: 'de', soundVolume: 'loud', haptics: 1, reducedMotion: 'maybe', tileMarks: null, highContrast: 'yes' },
      bestScore: '100',
      bestStage: null,
      challenges: [],
      tutorialSeen: 'true',
      gamesPlayed: Number.POSITIVE_INFINITY,
    });
    expect(repaired).toBe(true);
    expect(data).toEqual(defaultSave());
  });

  it('keeps a well-formed skin id, also one this build does not ship', () => {
    for (const skin of ['default', 'kit', 'some-later-skin2']) {
      const save = sample();
      save.settings.skin = skin;
      expect(parseSave(save)).toEqual({ kind: 'ok', data: save, repaired: false });
    }
  });

  it('treats a save without a skin as an older save, not a damaged one', () => {
    const old = sample() as unknown as { settings: Record<string, unknown> };
    delete old.settings.skin;
    const outcome = sanitizeSave(old);
    expect(outcome.repaired).toBe(false);
    expect(outcome.data.settings.skin).toBe(DEFAULT_SETTINGS.skin);
  });

  it('resets a malformed skin id', () => {
    for (const skin of ['', 'Kit', '../x', 'a b', 7, null, 'x'.repeat(40), '__proto__']) {
      const save = sample() as unknown as { settings: Record<string, unknown> };
      save.settings.skin = skin;
      const outcome = sanitizeSave(save);
      expect(outcome.data.settings.skin, String(skin)).toBe(DEFAULT_SETTINGS.skin);
      expect(outcome.repaired, String(skin)).toBe(true);
    }
  });

  it('replaces missing settings with defaults', () => {
    expect(sanitizeSave({ version: 1 })).toEqual({ data: defaultSave(), repaired: true });
    expect(sanitizeSave(null)).toEqual({ data: defaultSave(), repaired: true });
  });

  it('clamps ranges and rounds to integers', () => {
    const { data, repaired } = sanitizeSave({
      ...sample(),
      settings: { ...DEFAULT_SETTINGS, soundVolume: 7 },
      bestScore: -5,
      bestStage: 5e9,
      gamesPlayed: 3.9,
    });
    expect(repaired).toBe(true);
    expect(data.settings.soundVolume).toBe(1);
    expect(data.bestScore).toBe(0);
    expect(data.bestStage).toBe(SAVE_LIMITS.maxStage);
    expect(data.gamesPlayed).toBe(3);
    expect(sanitizeSave({ ...sample(), settings: { ...DEFAULT_SETTINGS, soundVolume: -1 } }).data.settings.soundVolume).toBe(0);
  });

  it('keeps unknown challenge ids and drops malformed entries', () => {
    const { data, repaired } = sanitizeSave({
      ...sample(),
      challenges: {
        'future-challenge-77': { completed: true, bestScore: 10 },
        partial: { completed: 'yes', bestScore: -3 },
        broken: 5,
        '': { completed: true, bestScore: 1 },
        ['x'.repeat(SAVE_LIMITS.maxChallengeIdLength + 1)]: { completed: true, bestScore: 1 },
      },
    });
    expect(repaired).toBe(true);
    expect(data.challenges).toEqual({
      'future-challenge-77': { completed: true, bestScore: 10 },
      partial: { completed: false, bestScore: 0 },
    });
  });

  it('is not fooled by a __proto__ challenge id', () => {
    const value = JSON.parse(`{"version":1,"challenges":{"__proto__":{"completed":true,"bestScore":5}}}`) as unknown;
    const { data } = sanitizeSave(value);
    expect(Object.keys(data.challenges)).toEqual([]);
    expect(Object.getPrototypeOf(data.challenges)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).completed).toBeUndefined();
  });

  it('limits the number of challenge entries', () => {
    const challenges: Record<string, unknown> = {};
    for (let i = 0; i < SAVE_LIMITS.maxChallenges + 5; i += 1) challenges[`c${i}`] = { completed: false, bestScore: i };
    const { data, repaired } = sanitizeSave({ ...sample(), challenges });
    expect(Object.keys(data.challenges)).toHaveLength(SAVE_LIMITS.maxChallenges);
    expect(repaired).toBe(true);
  });

  it('drops unknown top-level and settings fields', () => {
    const { data } = sanitizeSave({ ...sample(), extra: 1, settings: { ...sample().settings, extra: 2 } });
    expect(data).toEqual(sample());
  });
});

describe('VersionedSaveService', () => {
  it('starts on defaults with an empty store and writes nothing on load', async () => {
    const store = new MemoryStore();
    const save = new VersionedSaveService(store, quiet);
    expect(save.data).toEqual(defaultSave());
    expect(await save.load()).toEqual(defaultSave());
    expect(store.entries.size).toBe(0);
  });

  it('round-trips through the store', async () => {
    const store = new MemoryStore();
    const first = new VersionedSaveService(store, quiet);
    await first.load();
    await first.update((draft) => {
      draft.bestScore = 1234;
      draft.settings.language = 'pl';
      draft.challenges['c-01'] = { completed: true, bestScore: 50 };
    });
    const second = new VersionedSaveService(store, quiet);
    const loaded = await second.load();
    expect(loaded.bestScore).toBe(1234);
    expect(loaded.settings.language).toBe('pl');
    expect(loaded.challenges).toEqual({ 'c-01': { completed: true, bestScore: 50 } });
    expect(loaded).toEqual(first.data);
  });

  it('updates in-memory data at once', async () => {
    const save = new VersionedSaveService(new MemoryStore(), quiet);
    await save.load();
    const pending = save.update((draft) => {
      draft.gamesPlayed = 3;
    });
    expect(save.data.gamesPlayed).toBe(3);
    await pending;
  });

  it('alternates slots with a rising sequence', async () => {
    const store = new TrickStore();
    const save = new VersionedSaveService(store, quiet);
    await save.load();
    for (let i = 1; i <= 3; i += 1) {
      await save.update((draft) => {
        draft.gamesPlayed = i;
      });
    }
    expect(store.sets).toEqual([SAVE_KEYS.slotA, SAVE_KEYS.slotB, SAVE_KEYS.slotA]);
    expect(decodeSlot(store.entries.get(SAVE_KEYS.slotA) ?? '')?.seq).toBe(3);
    expect(decodeSlot(store.entries.get(SAVE_KEYS.slotB) ?? '')?.seq).toBe(2);
  });

  it('loads the slot with the highest sequence and writes to the other one', async () => {
    const store = new TrickStore();
    store.entries.set(SAVE_KEYS.slotA, slot(8, sample({ bestScore: 1 })));
    store.entries.set(SAVE_KEYS.slotB, slot(9, sample({ bestScore: 2 })));
    const save = new VersionedSaveService(store, quiet);
    expect((await save.load()).bestScore).toBe(2);
    await save.update((draft) => {
      draft.bestScore = 3;
    });
    expect(store.sets).toEqual([SAVE_KEYS.slotA]);
    expect(decodeSlot(store.entries.get(SAVE_KEYS.slotA) ?? '')?.seq).toBe(10);
  });

  it('survives a torn write: the previous slot is used', async () => {
    const store = new TrickStore();
    const save = new VersionedSaveService(store, quiet);
    await save.load();
    await save.update((draft) => {
      draft.bestScore = 100;
    });
    // The next write is cut in half, as if the process died mid-write.
    store.onSet = (_key, value) => value.slice(0, Math.floor(value.length / 2));
    await save.update((draft) => {
      draft.bestScore = 200;
    });
    expect(store.entries.get(SAVE_KEYS.slotB)).toBeDefined();
    expect(decodeSlot(store.entries.get(SAVE_KEYS.slotB) ?? '')).toBeNull();

    const reloaded = new VersionedSaveService(store, quiet);
    expect((await reloaded.load()).bestScore).toBe(100);
    // A torn slot next to a good one is not an incident worth a backup.
    expect(store.entries.has(SAVE_KEYS.corruptB)).toBe(false);
  });

  it('does not flip to a slot that failed to read back, and retries it next time', async () => {
    const store = new TrickStore();
    const save = new VersionedSaveService(store, quiet);
    await save.load();
    await save.update((draft) => {
      draft.bestScore = 100;
    });
    store.onSet = (_key, value) => value.slice(0, 10);
    await save.update((draft) => {
      draft.bestScore = 200;
    });
    store.onSet = null;
    await save.update((draft) => {
      draft.bestScore = 300;
    });
    expect(store.sets).toEqual([SAVE_KEYS.slotA, SAVE_KEYS.slotB, SAVE_KEYS.slotB]);
    expect(decodeSlot(store.entries.get(SAVE_KEYS.slotA) ?? '')?.seq).toBe(1);
    const reloaded = new VersionedSaveService(store, quiet);
    expect((await reloaded.load()).bestScore).toBe(300);
  });

  it('backs up corrupt slots and starts from defaults', async () => {
    const store = new MemoryStore();
    store.entries.set(SAVE_KEYS.slotA, 'not json at all');
    store.entries.set(SAVE_KEYS.slotB, '{"half":');
    const save = new VersionedSaveService(store, quiet);
    expect(await save.load()).toEqual(defaultSave());
    expect(store.entries.get(SAVE_KEYS.corruptA)).toBe('not json at all');
    expect(store.entries.get(SAVE_KEYS.corruptB)).toBe('{"half":');
    await save.update((draft) => {
      draft.gamesPlayed = 1;
    });
    const reloaded = new VersionedSaveService(store, quiet);
    expect((await reloaded.load()).gamesPlayed).toBe(1);
    expect(store.entries.get(SAVE_KEYS.corruptA)).toBe('not json at all');
  });

  it('falls back to the older slot when the newest has an intact envelope but a corrupt payload', async () => {
    const store = new MemoryStore();
    const bad = encodeSlot({ seq: 5, payload: '"just a string"' });
    store.entries.set(SAVE_KEYS.slotA, slot(4, sample({ bestScore: 44 })));
    store.entries.set(SAVE_KEYS.slotB, bad);
    const save = new VersionedSaveService(store, quiet);
    expect((await save.load()).bestScore).toBe(44);
    expect(store.entries.get(SAVE_KEYS.corruptB)).toBe(bad);
    await save.update((draft) => {
      draft.bestScore = 45;
    });
    expect(decodeSlot(store.entries.get(SAVE_KEYS.slotB) ?? '')?.seq).toBe(6);
  });

  it('repairs invalid fields, keeping the original under the backup key', async () => {
    const store = new MemoryStore();
    const raw = slot(2, { ...sample(), bestScore: 'many', settings: { ...sample().settings, soundVolume: 9 } });
    store.entries.set(SAVE_KEYS.slotA, raw);
    const save = new VersionedSaveService(store, quiet);
    const data = await save.load();
    expect(data.bestScore).toBe(0);
    expect(data.settings.soundVolume).toBe(1);
    expect(data.bestStage).toBe(7);
    expect(store.entries.get(SAVE_KEYS.corruptA)).toBe(raw);
  });

  it('treats an oversized value as corrupt', async () => {
    const store = new MemoryStore();
    store.entries.set(SAVE_KEYS.slotA, slot(1, { ...sample(), junk: 'x'.repeat(SAVE_LIMITS.maxRawLength) }));
    const save = new VersionedSaveService(store, quiet);
    expect(await save.load()).toEqual(defaultSave());
    expect(store.entries.get(SAVE_KEYS.corruptA)?.length).toBe(SAVE_LIMITS.maxRawLength);
  });

  it('treats a version older than any known format as corrupt', async () => {
    const store = new MemoryStore();
    const raw = slot(1, { ...sample(), version: 0 });
    store.entries.set(SAVE_KEYS.slotA, raw);
    const save = new VersionedSaveService(store, quiet);
    expect(await save.load()).toEqual(defaultSave());
    expect(store.entries.get(SAVE_KEYS.corruptA)).toBe(raw);
  });

  it('never destroys a save from a newer version', async () => {
    const store = new MemoryStore();
    const newer = slot(7, { ...sample(), version: 2, somethingNew: [1, 2, 3] });
    store.entries.set(SAVE_KEYS.slotB, newer);
    const save = new VersionedSaveService(store, quiet);
    expect(await save.load()).toEqual(defaultSave());
    expect(store.entries.get(SAVE_KEYS.newer)).toBe(newer);
    // Loading alone leaves the slot as it was.
    expect(store.entries.get(SAVE_KEYS.slotB)).toBe(newer);

    await save.update((draft) => {
      draft.bestScore = 5;
    });
    await save.update((draft) => {
      draft.bestScore = 6;
    });
    expect(store.entries.get(SAVE_KEYS.newer)).toBe(newer);
    const reloaded = new VersionedSaveService(store, quiet);
    expect((await reloaded.load()).bestScore).toBe(6);
    expect(store.entries.get(SAVE_KEYS.newer)).toBe(newer);
  });

  it('prefers safety over an older slot when a newer-version save is present', async () => {
    const store = new MemoryStore();
    store.entries.set(SAVE_KEYS.slotA, slot(3, sample({ bestScore: 33 })));
    store.entries.set(SAVE_KEYS.slotB, slot(4, { ...sample(), version: 5 }));
    const save = new VersionedSaveService(store, quiet);
    expect(await save.load()).toEqual(defaultSave());
    expect(store.entries.has(SAVE_KEYS.newer)).toBe(true);
  });

  it('keeps an envelope format from the future', async () => {
    const store = new MemoryStore();
    const future = '{"f":2,"data":"opaque"}';
    store.entries.set(SAVE_KEYS.slotA, future);
    const save = new VersionedSaveService(store, quiet);
    expect(await save.load()).toEqual(defaultSave());
    expect(store.entries.get(SAVE_KEYS.newer)).toBe(future);
    expect(store.entries.has(SAVE_KEYS.corruptA)).toBe(false);
  });

  it('stops writing when a newer save cannot be backed up', async () => {
    const store = new TrickStore();
    const newer = slot(7, { ...sample(), version: 2 });
    store.entries.set(SAVE_KEYS.slotA, newer);
    store.failSets = true;
    const save = new VersionedSaveService(store, quiet);
    await save.load();
    store.failSets = false;
    await save.update((draft) => {
      draft.bestScore = 5;
    });
    expect(save.isPersistent).toBe(false);
    expect(save.data.bestScore).toBe(5);
    expect(store.entries.get(SAVE_KEYS.slotA)).toBe(newer);
    expect(store.entries.has(SAVE_KEYS.slotB)).toBe(false);
  });

  it('never throws when the store throws on read, and does not overwrite what it could not read', async () => {
    const store = new TrickStore();
    const good = slot(3, sample());
    store.entries.set(SAVE_KEYS.slotA, good);
    store.failGets = true;
    const logged: string[] = [];
    const save = new VersionedSaveService(store, (_scope, message) => logged.push(message));
    expect(await save.load()).toEqual(defaultSave());
    store.failGets = false;
    await expect(
      save.update((draft) => {
        draft.bestScore = 1;
      }),
    ).resolves.toBeUndefined();
    expect(save.data.bestScore).toBe(1);
    expect(save.isPersistent).toBe(false);
    expect(store.entries.get(SAVE_KEYS.slotA)).toBe(good);
    expect(store.sets).toEqual([]);
    expect(logged.length).toBeGreaterThan(0);
  });

  it('retries a read that fails once', async () => {
    const store = new TrickStore();
    store.entries.set(SAVE_KEYS.slotA, slot(3, sample()));
    let calls = 0;
    const original = store.get.bind(store);
    store.get = async (key) => {
      calls += 1;
      if (calls === 1) throw new Error('transient');
      return original(key);
    };
    const save = new VersionedSaveService(store, quiet);
    expect(await save.load()).toEqual(sample());
    expect(save.isPersistent).toBe(true);
  });

  it('keeps data in memory when the store throws on write, and recovers later', async () => {
    const store = new TrickStore();
    const save = new VersionedSaveService(store, quiet);
    await save.load();
    store.failSets = true;
    await expect(
      save.update((draft) => {
        draft.bestScore = 10;
      }),
    ).resolves.toBeUndefined();
    expect(save.data.bestScore).toBe(10);
    store.failSets = false;
    await save.update((draft) => {
      draft.bestStage = 2;
    });
    const reloaded = new VersionedSaveService(store, quiet);
    expect(await reloaded.load()).toMatchObject({ bestScore: 10, bestStage: 2 });
  });

  it('serialises concurrent updates in call order', async () => {
    const store = new TrickStore();
    const order: string[] = [];
    let active = 0;
    let overlapped = false;
    const slowSet = store.set.bind(store);
    store.set = async (key, value) => {
      active += 1;
      if (active > 1) overlapped = true;
      order.push(`start ${decodeSlot(value)?.seq}`);
      await new Promise((resolve) => setTimeout(resolve, 5 - order.length));
      await slowSet(key, value);
      order.push(`end ${decodeSlot(value)?.seq}`);
      active -= 1;
    };
    const save = new VersionedSaveService(store, quiet);
    await save.load();
    await Promise.all([1, 2, 3].map((n) => save.update((draft) => {
      draft.gamesPlayed += n;
    })));
    expect(overlapped).toBe(false);
    expect(order).toEqual(['start 1', 'end 1', 'start 2', 'end 2', 'start 3', 'end 3']);
    const reloaded = new VersionedSaveService(store, quiet);
    expect((await reloaded.load()).gamesPlayed).toBe(6);
  });

  it('an update issued before load waits for it and does not clobber stored data', async () => {
    const store = new MemoryStore();
    store.entries.set(SAVE_KEYS.slotA, slot(1, sample({ gamesPlayed: 12 })));
    const save = new VersionedSaveService(store, quiet);
    await save.update((draft) => {
      draft.gamesPlayed += 1;
    });
    expect(save.data.gamesPlayed).toBe(13);
    expect(save.data.bestScore).toBe(4200);
  });

  it('load is idempotent', async () => {
    const store = new MemoryStore();
    const save = new VersionedSaveService(store, quiet);
    const first = await save.load();
    await save.update((draft) => {
      draft.bestScore = 9;
    });
    expect(await save.load()).toBe(first);
    expect(save.data.bestScore).toBe(9);
  });

  it('rejects and changes nothing when the mutation throws', async () => {
    const store = new MemoryStore();
    const save = new VersionedSaveService(store, quiet);
    await save.load();
    await expect(
      save.update((draft) => {
        draft.bestScore = 99;
        throw new Error('bug');
      }),
    ).rejects.toThrow('bug');
    expect(save.data.bestScore).toBe(0);
    expect(store.entries.size).toBe(0);
  });

  it('clamps values written by callers', async () => {
    const save = new VersionedSaveService(new MemoryStore(), quiet);
    await save.load();
    await save.update((draft) => {
      draft.settings.soundVolume = 3;
      draft.bestScore = -1;
    });
    expect(save.data.settings.soundVolume).toBe(1);
    expect(save.data.bestScore).toBe(0);
  });

  it('gives the mutation a draft, not the live object', async () => {
    const save = new VersionedSaveService(new MemoryStore(), quiet);
    await save.load();
    const before = save.data;
    await save.update((draft) => {
      expect(draft).not.toBe(before);
      draft.tutorialSeen = true;
    });
    expect(before.tutorialSeen).toBe(false);
    expect(save.data.tutorialSeen).toBe(true);
  });
});
