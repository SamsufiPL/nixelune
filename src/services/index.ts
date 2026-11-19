import { Capacitor } from '@capacitor/core';
import type { AppLifecycle, HapticsService, KeyValueStore, LanguageCode, SaveData, Services } from '../platform/types';
import { FakeAudio } from './audio/fakeAudio';
import { WebAudioService } from './audio/webAudio';
import { createFakeHaptics, createHaptics, createWebHapticDriver } from './haptics';
import type { FakeHaptics } from './haptics';
import { createI18n } from './i18n';
import type { Catalogues } from './i18n';
import { FakeLifecycle, InertLifecycle, WebLifecycle } from './lifecycle';
import { consoleLogger, silentLogger } from './log';
import type { Logger } from './log';
import { VersionedSaveService } from './save/saveService';
import { MemoryStore, WebStorageStore } from './save/stores';

export { resolveReducedMotion, systemPrefersReducedMotion } from './motion';
export { SAVE_KEYS } from './save/saveService';
export { MemoryStore } from './save/stores';
export { FakeAudio } from './audio/fakeAudio';
export { FakeLifecycle } from './lifecycle';
export type { FakeHaptics } from './haptics';

function detectNative(log: Logger): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch (error) {
    log('services', 'platform detection failed, assuming web', error);
    return false;
  }
}

function createWebStore(log: Logger): KeyValueStore {
  try {
    // Accessing localStorage itself throws when storage is blocked.
    const storage = globalThis.localStorage;
    if (storage) return new WebStorageStore(storage);
  } catch (error) {
    log('services', 'localStorage is unavailable', error);
  }
  log('services', 'no persistent storage; progress lasts until the page closes');
  return new MemoryStore();
}

function createWebLifecycle(log: Logger): AppLifecycle {
  if (typeof document !== 'undefined' && typeof window !== 'undefined') return new WebLifecycle(document, window, log);
  return new InertLifecycle(log);
}

/** Pushes persisted settings into the services that hold their own copy. */
function applySettings(services: Services, data: SaveData): void {
  services.i18n.setLanguage(data.settings.language);
  services.audio.setVolume(data.settings.soundVolume);
  services.haptics.setEnabled(data.settings.haptics);
}

/**
 * Builds the real service graph: Capacitor adapters inside the native shell, web
 * fallbacks elsewhere. The save is loaded and its settings applied before this resolves;
 * audio is silenced while the app is in the background. The caller owns the result.
 */
export async function createServices(): Promise<Services> {
  const log = consoleLogger;
  const isNative = detectNative(log);

  let store: KeyValueStore | null = null;
  let haptics: HapticsService | null = null;
  let lifecycle: AppLifecycle | null = null;
  if (isNative) {
    try {
      const native = await import('./native');
      store = new native.PreferencesStore();
      haptics = createHaptics(native.nativeHapticDriver, log);
      lifecycle = new native.NativeLifecycle(log);
    } catch (error) {
      log('services', 'native adapters failed to load, using web fallbacks', error);
    }
  }
  store ??= createWebStore(log);
  haptics ??= createHaptics(createWebHapticDriver(), log);
  lifecycle ??= createWebLifecycle(log);

  const save = new VersionedSaveService(store, log);
  const audio = new WebAudioService(undefined, log);
  const i18n = createI18n({ log });
  const services: Services = { save, audio, haptics, lifecycle, i18n, isNative };

  applySettings(services, await save.load());
  lifecycle.onPause(() => audio.suspend());
  lifecycle.onResume(() => audio.resume());
  return services;
}

export interface FakeServices extends Services {
  /** The real save service over `store`, so tests exercise real validation. */
  readonly save: VersionedSaveService;
  readonly audio: FakeAudio;
  readonly haptics: FakeHaptics;
  readonly lifecycle: FakeLifecycle;
  /** Backing store of `save`; pre-fill or inspect it in tests. */
  readonly store: MemoryStore;
}

export interface FakeServicesOptions {
  /** Device languages seen by i18n when the choice is 'system'. Default: none, so English. */
  readonly systemLanguages?: readonly string[];
  /** Language selected at creation. Default 'system'. */
  readonly language?: 'system' | LanguageCode;
  readonly catalogues?: Catalogues;
  readonly isNative?: boolean;
}

/** In-memory services for tests. Nothing touches the platform; every call creates a separate graph. */
export function createFakeServices(options: FakeServicesOptions = {}): FakeServices {
  const store = new MemoryStore();
  const systemLanguages = options.systemLanguages ?? [];
  const i18n = createI18n({ catalogues: options.catalogues, systemLanguages: () => systemLanguages, log: silentLogger });
  if (options.language) i18n.setLanguage(options.language);
  return {
    store,
    save: new VersionedSaveService(store, silentLogger),
    audio: new FakeAudio(),
    haptics: createFakeHaptics(),
    lifecycle: new FakeLifecycle(silentLogger),
    i18n,
    isNative: options.isNative ?? false,
  };
}
