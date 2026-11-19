import { DEFAULT_SETTINGS, LANGUAGES, SKIN_ID_PATTERN } from '../../platform/types';
import type { ChallengeRecord, SaveData, Settings } from '../../platform/types';

/** Highest save format this build understands. */
export const SAVE_VERSION = 1;

/** Upper bounds applied while validating; anything above is clamped. */
export const SAVE_LIMITS = {
  /** Scores are integers; beyond this JSON numbers lose precision. */
  maxScore: Number.MAX_SAFE_INTEGER,
  maxStage: 1_000_000,
  maxGamesPlayed: Number.MAX_SAFE_INTEGER,
  /** Entries kept in `challenges`; far above any planned challenge count. */
  maxChallenges: 1000,
  maxChallengeIdLength: 64,
  /** Characters of a stored slot value; larger values are treated as corrupt. */
  maxRawLength: 262_144,
} as const;

export function defaultSave(): SaveData {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    bestScore: 0,
    bestStage: 0,
    challenges: {},
    tutorialSeen: false,
    gamesPlayed: 0,
  };
}

type Dict = Record<string, unknown>;

/** Upgrades a save object from version N (the key) to N + 1. Empty while version 1 is the first format. */
export type Migrations = Readonly<Record<number, (old: Dict) => Dict>>;
export const MIGRATIONS: Migrations = {};

export type ParseOutcome =
  /** `repaired` is true when any field had to be defaulted, clamped or dropped. */
  | { readonly kind: 'ok'; readonly data: SaveData; readonly repaired: boolean }
  | { readonly kind: 'newer'; readonly version: number }
  | { readonly kind: 'corrupt'; readonly reason: string };

function isDict(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Tracks whether validation changed anything. */
class Repairs {
  count = 0;
  note(): void {
    this.count += 1;
  }
}

function bool(value: unknown, fallback: boolean, repairs: Repairs): boolean {
  if (typeof value === 'boolean') return value;
  repairs.note();
  return fallback;
}

function boundedInt(value: unknown, max: number, fallback: number, repairs: Repairs): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    repairs.note();
    return fallback;
  }
  const clamped = Math.min(max, Math.max(0, Math.floor(value)));
  if (clamped !== value) repairs.note();
  return clamped;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T, repairs: Repairs): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  repairs.note();
  return fallback;
}

/**
 * Skin ids are validated by shape, not against a list: the set of skins changes from
 * build to build, and an id this build does not ship is resolved to the default skin
 * when it is applied. A missing field is an older save, not damage: no repair noted.
 */
function skinId(value: unknown, repairs: Repairs): string {
  if (value === undefined) return DEFAULT_SETTINGS.skin;
  if (typeof value === 'string' && SKIN_ID_PATTERN.test(value)) return value;
  repairs.note();
  return DEFAULT_SETTINGS.skin;
}

function sanitizeSettings(value: unknown, repairs: Repairs): Settings {
  if (!isDict(value)) {
    repairs.note();
    return { ...DEFAULT_SETTINGS };
  }
  let soundVolume = DEFAULT_SETTINGS.soundVolume;
  if (typeof value.soundVolume === 'number' && Number.isFinite(value.soundVolume)) {
    soundVolume = Math.min(1, Math.max(0, value.soundVolume));
    if (soundVolume !== value.soundVolume) repairs.note();
  } else {
    repairs.note();
  }
  return {
    language: oneOf(value.language, ['system', ...LANGUAGES], DEFAULT_SETTINGS.language, repairs),
    soundVolume,
    haptics: bool(value.haptics, DEFAULT_SETTINGS.haptics, repairs),
    reducedMotion: oneOf(value.reducedMotion, ['system', 'on', 'off'], DEFAULT_SETTINGS.reducedMotion, repairs),
    tileMarks: bool(value.tileMarks, DEFAULT_SETTINGS.tileMarks, repairs),
    highContrast: bool(value.highContrast, DEFAULT_SETTINGS.highContrast, repairs),
    skin: skinId(value.skin, repairs),
  };
}

function isAcceptableChallengeId(id: string): boolean {
  return id.length > 0 && id.length <= SAVE_LIMITS.maxChallengeIdLength && id !== '__proto__';
}

/** Ids this build does not know are kept: a later build (or a removed challenge) may own them. */
function sanitizeChallenges(value: unknown, repairs: Repairs): Record<string, ChallengeRecord> {
  const result: Record<string, ChallengeRecord> = {};
  if (!isDict(value)) {
    repairs.note();
    return result;
  }
  let kept = 0;
  for (const id of Object.keys(value)) {
    const entry = value[id];
    if (kept >= SAVE_LIMITS.maxChallenges || !isAcceptableChallengeId(id) || !isDict(entry)) {
      repairs.note();
      continue;
    }
    result[id] = {
      completed: bool(entry.completed, false, repairs),
      bestScore: boundedInt(entry.bestScore, SAVE_LIMITS.maxScore, 0, repairs),
    };
    kept += 1;
  }
  return result;
}

/** Field-by-field validation of a current-version object. Never throws, always returns usable data. */
export function sanitizeSave(value: unknown): { data: SaveData; repaired: boolean } {
  const repairs = new Repairs();
  const source: Dict = isDict(value) ? value : {};
  if (!isDict(value)) repairs.note();
  const data: SaveData = {
    version: 1,
    settings: sanitizeSettings(source.settings, repairs),
    bestScore: boundedInt(source.bestScore, SAVE_LIMITS.maxScore, 0, repairs),
    bestStage: boundedInt(source.bestStage, SAVE_LIMITS.maxStage, 0, repairs),
    challenges: sanitizeChallenges(source.challenges, repairs),
    tutorialSeen: bool(source.tutorialSeen, false, repairs),
    gamesPlayed: boundedInt(source.gamesPlayed, SAVE_LIMITS.maxGamesPlayed, 0, repairs),
  };
  return { data, repaired: repairs.count > 0 };
}

/**
 * Turns a parsed JSON value into validated save data: checks the version, migrates
 * old formats step by step, then validates every field.
 */
export function parseSave(value: unknown, migrations: Migrations = MIGRATIONS, currentVersion: number = SAVE_VERSION): ParseOutcome {
  if (!isDict(value)) return { kind: 'corrupt', reason: 'not an object' };
  const version = value.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    return { kind: 'corrupt', reason: 'missing or invalid version' };
  }
  if (version > currentVersion) return { kind: 'newer', version };
  let current: Dict = value;
  for (let from = version; from < currentVersion; from += 1) {
    const step = migrations[from];
    if (!step) return { kind: 'corrupt', reason: `no migration from version ${from}` };
    try {
      current = step(current);
    } catch {
      return { kind: 'corrupt', reason: `migration from version ${from} failed` };
    }
    if (!isDict(current)) return { kind: 'corrupt', reason: `migration from version ${from} returned no object` };
  }
  const { data, repaired } = sanitizeSave(current);
  return { kind: 'ok', data, repaired };
}
