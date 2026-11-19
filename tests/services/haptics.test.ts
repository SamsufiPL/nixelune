import { describe, expect, it } from 'vitest';
import type { HapticKind } from '../../src/platform/types';
import { HAPTIC_PATTERNS, createFakeHaptics, createHaptics, createWebHapticDriver } from '../../src/services/haptics';

const KINDS: readonly HapticKind[] = ['tick', 'land', 'activate', 'over'];
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('haptic patterns', () => {
  it('defines every kind and nothing else', () => {
    expect(Object.keys(HAPTIC_PATTERNS).sort()).toEqual([...KINDS].sort());
  });

  it('keeps every web pattern short', () => {
    for (const kind of KINDS) {
      const web = HAPTIC_PATTERNS[kind].web;
      const parts = typeof web === 'number' ? [web] : [...web];
      expect(parts.length % 2, kind).toBe(1);
      for (const part of parts) expect(part).toBeGreaterThan(0);
      expect(parts.reduce((sum, part) => sum + part, 0), kind).toBeLessThanOrEqual(120);
    }
  });

  it('the frequent tick is the lightest', () => {
    expect(HAPTIC_PATTERNS.tick.native).toEqual({ kind: 'impact', style: 'light' });
    expect(HAPTIC_PATTERNS.tick.web).toBeLessThan(HAPTIC_PATTERNS.land.web as number);
  });
});

describe('createHaptics', () => {
  it('passes the pattern to the driver', () => {
    const seen: unknown[] = [];
    const haptics = createHaptics((pattern, kind) => {
      seen.push([kind, pattern]);
    });
    haptics.fire('land');
    expect(seen).toEqual([['land', HAPTIC_PATTERNS.land]]);
  });

  it('does nothing when disabled', () => {
    let calls = 0;
    const haptics = createHaptics(() => {
      calls += 1;
    });
    haptics.setEnabled(false);
    haptics.fire('tick');
    expect(calls).toBe(0);
    haptics.setEnabled(true);
    haptics.fire('tick');
    expect(calls).toBe(1);
  });

  it('logs a throwing driver', () => {
    const logged: string[] = [];
    const haptics = createHaptics(
      () => {
        throw new Error('sdk');
      },
      (_scope, message) => logged.push(message),
    );
    expect(() => haptics.fire('over')).not.toThrow();
    expect(logged).toEqual(['over failed']);
  });

  it('logs a rejecting driver', async () => {
    const logged: string[] = [];
    const haptics = createHaptics(
      () => Promise.reject(new Error('sdk')),
      (_scope, message) => logged.push(message),
    );
    haptics.fire('activate');
    await settle();
    expect(logged).toEqual(['activate failed']);
  });

  it('ignores an unknown kind', () => {
    let calls = 0;
    const haptics = createHaptics(() => {
      calls += 1;
    });
    haptics.fire('nope' as HapticKind);
    expect(calls).toBe(0);
  });
});

describe('web driver', () => {
  it('calls navigator.vibrate with the web pattern', () => {
    const calls: unknown[] = [];
    const nav = {
      vibrate: (pattern: unknown) => {
        calls.push(pattern);
        return true;
      },
    } as unknown as Navigator;
    const haptics = createHaptics(createWebHapticDriver(nav));
    haptics.fire('tick');
    haptics.fire('activate');
    expect(calls).toEqual([HAPTIC_PATTERNS.tick.web, [...(HAPTIC_PATTERNS.activate.web as number[])]]);
  });

  it('is a no-op without the Vibration API', () => {
    const haptics = createHaptics(createWebHapticDriver({} as Navigator));
    expect(() => haptics.fire('tick')).not.toThrow();
    expect(() => createHaptics(createWebHapticDriver(undefined)).fire('tick')).not.toThrow();
  });
});

describe('fake haptics', () => {
  it('records what fired and respects the switch', () => {
    const haptics = createFakeHaptics();
    haptics.fire('tick');
    haptics.setEnabled(false);
    expect(haptics.enabled).toBe(false);
    haptics.fire('land');
    haptics.setEnabled(true);
    haptics.fire('over');
    expect(haptics.fired).toEqual(['tick', 'over']);
  });
});
