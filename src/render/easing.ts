/** Easing curves and small numeric helpers for presentation timing. Pure. */

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

export function easeInQuad(t: number): number {
  const c = clamp01(t);
  return c * c;
}

export function easeInOutQuad(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 2 * c * c : 1 - (2 - 2 * c) * (1 - c);
}

/** Progress 0..1 of an interval that started at `t0` and lasts `dur` ms. A zero duration is done at once. */
export function progress(now: number, t0: number, dur: number): number {
  if (dur <= 0) return now >= t0 ? 1 : 0;
  return clamp01((now - t0) / dur);
}
