/**
 * Platform and service contracts. Every service has a real adapter and a fake;
 * tests and plain browsers run on fakes or web adapters. An empty id switches a
 * store-backed service off. Names exported here are stable; add, do not rename.
 */

export type LanguageCode = 'pl' | 'en';
/** Order shown in settings. One list for the whole game. */
export const LANGUAGES: readonly LanguageCode[] = ['pl', 'en'];
export const FALLBACK_LANGUAGE: LanguageCode = 'en';

export interface Settings {
  /** 'system' follows the device language, falling back to English. */
  language: 'system' | LanguageCode;
  /** 0..1 */
  soundVolume: number;
  haptics: boolean;
  /** 'system' follows prefers-reduced-motion. */
  reducedMotion: 'system' | 'on' | 'off';
  /** Engraved per-colour marks on tiles, so colour is never the only cue. */
  tileMarks: boolean;
  highContrast: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  language: 'system',
  soundVolume: 0.7,
  haptics: true,
  reducedMotion: 'system',
  tileMarks: true,
  highContrast: false,
};

export interface ChallengeRecord {
  completed: boolean;
  bestScore: number;
}

/** Persisted progress. `version` rises with every format change; old versions migrate. */
export interface SaveData {
  version: 1;
  settings: Settings;
  bestScore: number;
  bestStage: number;
  /** Keyed by ChallengeDef.id. */
  challenges: Record<string, ChallengeRecord>;
  tutorialSeen: boolean;
  gamesPlayed: number;
}

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface SaveService {
  /** Never throws: a corrupt save is backed up and replaced by defaults. */
  load(): Promise<SaveData>;
  /** Current in-memory data (after load). */
  readonly data: SaveData;
  /** Mutate and persist atomically. Resolves when the write is durable. */
  update(mutate: (draft: SaveData) => void): Promise<void>;
}

export type SoundId =
  | 'move'
  | 'rotate'
  | 'blocked'
  | 'swap'
  | 'land'
  | 'activate'
  | 'stageComplete'
  | 'over'
  | 'uiTap';

export interface AudioService {
  /** Must be called from a user gesture before the first sound. */
  unlock(): void;
  /** `step` raises the pitch for chains (1 = first activation). */
  play(sound: SoundId, opts?: { step?: number }): void;
  setVolume(volume: number): void;
  /** Silence while the app is in the background. */
  suspend(): void;
  resume(): void;
}

export type HapticKind = 'tick' | 'land' | 'activate' | 'over';

export interface HapticsService {
  setEnabled(enabled: boolean): void;
  fire(kind: HapticKind): void;
}

export interface AppLifecycle {
  /** Fired when the app loses focus / goes to background. */
  onPause(listener: () => void): void;
  onResume(listener: () => void): void;
  /** Android hardware Back. Web: no-op. */
  onBack(listener: () => void): void;
  exitApp(): void;
}

export interface Services {
  readonly save: SaveService;
  readonly audio: AudioService;
  readonly haptics: HapticsService;
  readonly lifecycle: AppLifecycle;
  readonly i18n: I18n;
  readonly isNative: boolean;
}

/** A translated message: plain text or plural forms keyed by Intl.PluralRules category. */
export type Message = string | { readonly one?: string; readonly few?: string; readonly many?: string; readonly other: string };
/** `{name}` placeholders are replaced from params; plural messages pick the form from `count`. */
export type MessageParams = Record<string, string | number>;

export interface I18n {
  readonly language: LanguageCode;
  /** Resolve 'system' via the device languages; unknown languages fall back to English. */
  setLanguage(choice: 'system' | LanguageCode): void;
  t(key: string, params?: MessageParams): string;
  /** Locale-aware number formatting (grouping separators). */
  formatNumber(value: number): string;
  onChange(listener: () => void): void;
}

// Implemented in src/services/index.ts:
//   export function createServices(): Promise<Services>       (real adapters, web fallbacks)
//   export function createFakeServices(): Services            (for tests)
// Message catalogues live in src/i18n/pl.ts and src/i18n/en.ts, each
//   `export const messages: Record<string, Message>`; the key set must be identical.
