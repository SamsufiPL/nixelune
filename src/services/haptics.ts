import { DEFAULT_SETTINGS } from '../platform/types';
import type { HapticKind, HapticsService } from '../platform/types';
import { consoleLogger } from './log';
import type { Logger } from './log';

export interface HapticPattern {
  /** What the native plugin is asked for. */
  readonly native:
    | { readonly kind: 'impact'; readonly style: 'light' | 'medium' | 'heavy' }
    | { readonly kind: 'notification'; readonly type: 'success' | 'warning' | 'error' };
  /** `navigator.vibrate` pattern in ms: one pulse, or pulse / pause / pulse ... */
  readonly web: number | readonly number[];
}

/** Restrained on purpose: short single pulses for play, one composed pattern per rare event. */
export const HAPTIC_PATTERNS: Readonly<Record<HapticKind, HapticPattern>> = {
  tick: { native: { kind: 'impact', style: 'light' }, web: 6 },
  land: { native: { kind: 'impact', style: 'medium' }, web: 14 },
  activate: { native: { kind: 'notification', type: 'success' }, web: [10, 40, 16] },
  over: { native: { kind: 'impact', style: 'heavy' }, web: 36 },
};

/** Performs one pattern on a concrete platform. May throw or reject; the service catches both. */
export type HapticDriver = (pattern: HapticPattern, kind: HapticKind) => void | Promise<void>;

/** The on/off switch and the error guard shared by every platform. */
export function createHaptics(driver: HapticDriver, log: Logger = consoleLogger): HapticsService {
  let enabled: boolean = DEFAULT_SETTINGS.haptics;
  return {
    setEnabled(value) {
      enabled = value === true;
    },
    fire(kind) {
      if (!enabled) return;
      const pattern = HAPTIC_PATTERNS[kind];
      if (!pattern) return;
      try {
        const pending = driver(pattern, kind);
        if (pending) pending.catch((error: unknown) => log('haptics', `${kind} failed`, error));
      } catch (error) {
        log('haptics', `${kind} failed`, error);
      }
    },
  };
}

/** Web fallback; silently does nothing where the Vibration API is missing (desktop, iOS Safari). */
export function createWebHapticDriver(nav: Pick<Navigator, 'vibrate'> | undefined = globalThis.navigator): HapticDriver {
  return (pattern) => {
    if (!nav || typeof nav.vibrate !== 'function') return;
    nav.vibrate(typeof pattern.web === 'number' ? pattern.web : [...pattern.web]);
  };
}

export interface FakeHaptics extends HapticsService {
  /** Kinds that actually fired (respecting the enabled switch), in order. */
  readonly fired: HapticKind[];
  readonly enabled: boolean;
}

export function createFakeHaptics(): FakeHaptics {
  const fired: HapticKind[] = [];
  let enabled: boolean = DEFAULT_SETTINGS.haptics;
  const inner = createHaptics((_pattern, kind) => {
    fired.push(kind);
  });
  return {
    fired,
    get enabled() {
      return enabled;
    },
    setEnabled(value) {
      enabled = value === true;
      inner.setEnabled(value);
    },
    fire: (kind) => inner.fire(kind),
  };
}
