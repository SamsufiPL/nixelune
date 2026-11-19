import { describe, expect, it } from 'vitest';
import { resolveReducedMotion, systemPrefersReducedMotion } from '../../src/services/motion';

describe('resolveReducedMotion', () => {
  it('lets an explicit setting win', () => {
    expect(resolveReducedMotion('on', false)).toBe(true);
    expect(resolveReducedMotion('off', true)).toBe(false);
  });

  it('follows the system otherwise', () => {
    expect(resolveReducedMotion('system', true)).toBe(true);
    expect(resolveReducedMotion('system', false)).toBe(false);
  });
});

describe('systemPrefersReducedMotion', () => {
  it('is false where media queries do not exist', () => {
    expect(systemPrefersReducedMotion()).toBe(false);
  });
});
