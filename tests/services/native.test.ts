import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, (payload: unknown) => void>();
  return {
    listeners,
    prefs: new Map<string, string>(),
    failing: { value: false },
    impact: [] as unknown[],
    notification: [] as unknown[],
    exitCalls: { value: 0 },
  };
});

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => {
      if (mocks.failing.value) throw new Error('bridge');
      return { value: mocks.prefs.get(key) ?? null };
    },
    set: async ({ key, value }: { key: string; value: string }) => {
      if (mocks.failing.value) throw new Error('bridge');
      mocks.prefs.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      mocks.prefs.delete(key);
    },
  },
}));

vi.mock('@capacitor/haptics', () => ({
  ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
  Haptics: {
    impact: async (options: unknown) => {
      if (mocks.failing.value) throw new Error('bridge');
      mocks.impact.push(options);
    },
    notification: async (options: unknown) => {
      mocks.notification.push(options);
    },
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: async (name: string, handler: (payload: unknown) => void) => {
      if (mocks.failing.value) throw new Error('bridge');
      mocks.listeners.set(name, handler);
      return { remove: async () => {} };
    },
    exitApp: async () => {
      mocks.exitCalls.value += 1;
      if (mocks.failing.value) throw new Error('bridge');
    },
  },
}));

import { createHaptics } from '../../src/services/haptics';
import { NativeLifecycle, PreferencesStore, nativeHapticDriver } from '../../src/services/native';
import { SAVE_KEYS, VersionedSaveService } from '../../src/services/save/saveService';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mocks.listeners.clear();
  mocks.prefs.clear();
  mocks.failing.value = false;
  mocks.impact.length = 0;
  mocks.notification.length = 0;
  mocks.exitCalls.value = 0;
});

describe('PreferencesStore (plugin mocked)', () => {
  it('maps get / set / remove', async () => {
    const store = new PreferencesStore();
    expect(await store.get('k')).toBeNull();
    await store.set('k', 'v');
    expect(mocks.prefs.get('k')).toBe('v');
    expect(await store.get('k')).toBe('v');
    await store.remove('k');
    expect(await store.get('k')).toBeNull();
  });

  it('carries a save round trip', async () => {
    const first = new VersionedSaveService(new PreferencesStore(), () => {});
    await first.load();
    await first.update((draft) => {
      draft.bestScore = 321;
    });
    expect(mocks.prefs.has(SAVE_KEYS.slotA)).toBe(true);
    const second = new VersionedSaveService(new PreferencesStore(), () => {});
    expect((await second.load()).bestScore).toBe(321);
  });

  it('a failing bridge does not break the save service', async () => {
    mocks.failing.value = true;
    const save = new VersionedSaveService(new PreferencesStore(), () => {});
    await expect(save.load()).resolves.toBeDefined();
    await expect(save.update(() => {})).resolves.toBeUndefined();
  });
});

describe('nativeHapticDriver (plugin mocked)', () => {
  it('maps patterns to plugin calls', async () => {
    const haptics = createHaptics(nativeHapticDriver);
    haptics.fire('tick');
    haptics.fire('land');
    haptics.fire('over');
    haptics.fire('activate');
    await settle();
    expect(mocks.impact).toEqual([{ style: 'LIGHT' }, { style: 'MEDIUM' }, { style: 'HEAVY' }]);
    expect(mocks.notification).toEqual([{ type: 'SUCCESS' }]);
  });

  it('logs plugin errors', async () => {
    mocks.failing.value = true;
    const logged: string[] = [];
    const haptics = createHaptics(nativeHapticDriver, (_scope, message) => logged.push(message));
    expect(() => haptics.fire('tick')).not.toThrow();
    await settle();
    expect(logged).toEqual(['tick failed']);
  });
});

describe('NativeLifecycle (plugin mocked)', () => {
  it('translates app state and the Back button', async () => {
    const lifecycle = new NativeLifecycle(() => {});
    await settle();
    const events: string[] = [];
    lifecycle.onPause(() => events.push('pause'));
    lifecycle.onResume(() => events.push('resume'));
    lifecycle.onBack(() => events.push('back'));
    mocks.listeners.get('appStateChange')?.({ isActive: false });
    mocks.listeners.get('appStateChange')?.({ isActive: false });
    mocks.listeners.get('appStateChange')?.({ isActive: true });
    mocks.listeners.get('backButton')?.({ canGoBack: false });
    expect(events).toEqual(['pause', 'resume', 'back']);
  });

  it('exits through the plugin', async () => {
    const lifecycle = new NativeLifecycle(() => {});
    lifecycle.exitApp();
    await settle();
    expect(mocks.exitCalls.value).toBe(1);
  });

  it('logs plugin errors instead of throwing', async () => {
    mocks.failing.value = true;
    const logged: string[] = [];
    const lifecycle = new NativeLifecycle((_scope, message) => logged.push(message));
    expect(() => lifecycle.exitApp()).not.toThrow();
    await settle();
    expect(logged.sort()).toEqual(['exitApp failed', 'listening to appStateChange failed', 'listening to backButton failed']);
  });
});
