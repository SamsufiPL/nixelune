/**
 * Which skin is active. Order of precedence at start-up: `?skin=<id>` in the URL,
 * then the `skin` setting from the save, then the build's default. A choice made in
 * the app wins from then on. Skin modules are loaded on demand.
 */
import { DEFAULT_SKIN_SETTING } from '../platform/types';
import type { LocalizedText, Skin } from '../render/skin';
import { DEFAULT_SKIN, SKINS, type SkinEntry } from '../render/skins/index';

export type SkinRegistry = Readonly<Record<string, SkinEntry>>;

/** Pick the skin id to use. Unknown ids are skipped, never an error. */
export function resolveSkinId(
  urlChoice: string | null | undefined,
  savedChoice: string | null | undefined,
  registry: SkinRegistry = SKINS,
  fallback: string = DEFAULT_SKIN,
): string {
  for (const choice of [urlChoice, savedChoice]) {
    if (choice && choice !== DEFAULT_SKIN_SETTING && Object.hasOwn(registry, choice)) return choice;
  }
  if (Object.hasOwn(registry, fallback)) return fallback;
  return Object.keys(registry)[0] ?? fallback;
}

/** `?skin=` from a location search string. */
export function skinFromSearch(search: string): string | null {
  try {
    return new URLSearchParams(search).get('skin');
  } catch {
    return null;
  }
}

export interface SkinChoice {
  readonly id: string;
  readonly name: LocalizedText;
}

export interface SkinManager {
  readonly skin: Skin;
  readonly id: string;
  readonly choices: readonly SkinChoice[];
  /** Load and activate a skin. Resolves to false when the id is unknown or loading failed. */
  select(id: string): Promise<boolean>;
  onChange(listener: (skin: Skin) => void): void;
}

export async function createSkinManager(initialId: string, registry: SkinRegistry = SKINS): Promise<SkinManager> {
  const listeners: ((skin: Skin) => void)[] = [];
  const loaded = new Map<string, Skin>();
  let request = 0;

  async function load(id: string): Promise<Skin | null> {
    const cached = loaded.get(id);
    if (cached) return cached;
    const entry = registry[id];
    if (!entry) return null;
    try {
      const skin = (await entry.load()).default;
      loaded.set(id, skin);
      return skin;
    } catch {
      return null;
    }
  }

  let currentId = resolveSkinId(initialId, null, registry);
  let current = await load(currentId);
  if (!current) {
    // The chosen skin failed to load: fall back to any skin that does.
    for (const id of Object.keys(registry)) {
      current = await load(id);
      if (current) {
        currentId = id;
        break;
      }
    }
  }
  if (!current) throw new Error('No skin could be loaded');
  let active: Skin = current;

  return {
    get skin() {
      return active;
    },
    get id() {
      return currentId;
    },
    choices: Object.keys(registry).map((id) => ({ id, name: registry[id]?.name ?? { pl: id, en: id } })),
    async select(id) {
      if (id === currentId) return true;
      const mine = ++request;
      const skin = await load(id);
      // A later choice made while this one was loading wins.
      if (!skin || mine !== request) return false;
      active = skin;
      currentId = id;
      for (const listener of [...listeners]) listener(skin);
      return true;
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };
}
