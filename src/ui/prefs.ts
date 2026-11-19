/** Effective presentation preferences: what the player set, falling back to the system. */
import type { Settings } from '../platform/types';

export interface SystemPrefs {
  readonly reducedMotion: boolean;
  readonly moreContrast: boolean;
}

export interface Prefs {
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  readonly marks: boolean;
}

export function resolvePrefs(settings: Settings, system: SystemPrefs): Prefs {
  return {
    reducedMotion:
      settings.reducedMotion === 'on' || (settings.reducedMotion === 'system' && system.reducedMotion),
    // The setting can only add contrast; a system request for more contrast is always honoured.
    highContrast: settings.highContrast || system.moreContrast,
    marks: settings.tileMarks,
  };
}

const QUERY_MOTION = '(prefers-reduced-motion: reduce)';
const QUERY_CONTRAST = '(prefers-contrast: more)';

function matches(query: string): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function readSystemPrefs(): SystemPrefs {
  return { reducedMotion: matches(QUERY_MOTION), moreContrast: matches(QUERY_CONTRAST) };
}

/** Call `listener` when the system preferences change while the app is open. */
export function watchSystemPrefs(listener: () => void): void {
  for (const query of [QUERY_MOTION, QUERY_CONTRAST]) {
    try {
      matchMedia(query).addEventListener('change', listener);
    } catch {
      // No media queries here; the settings screen still offers both switches.
    }
  }
}
