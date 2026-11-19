import type { Settings } from '../platform/types';

/** The setting wins; 'system' follows the device preference. */
export function resolveReducedMotion(setting: Settings['reducedMotion'], systemPrefersReduced: boolean): boolean {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return systemPrefersReduced;
}

/** Reads `prefers-reduced-motion`; false where media queries are unavailable. */
export function systemPrefersReducedMotion(): boolean {
  try {
    if (typeof matchMedia !== 'function') return false;
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
