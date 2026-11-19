/**
 * The kit's quiet background as a DOM backdrop: ink gradient, one faint orbit, a
 * horizon band and a sparse static star field. Styled in src/ui/themes/kit.css.
 */

/** Small deterministic generator so the star field is the same on every start. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export interface Star {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly opacity: number;
}

/** Stars in a 1000 x 1000 box. Radii and opacities follow the mockups (0.8-1.6, 0.08-0.35). */
export function starField(count: number, seed = 20240611): Star[] {
  const next = lcg(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.round(next() * 1000),
      y: Math.round(next() * 780),
      r: [0.8, 0.8, 1, 1.25][Math.floor(next() * 4)] ?? 1,
      opacity: Math.round((0.08 + next() * 0.24) * 100) / 100,
    });
  }
  return stars;
}

export function createKitBackdrop(): HTMLElement {
  const ns = 'http://www.w3.org/2000/svg';
  const stars = document.createElementNS(ns, 'svg');
  stars.setAttribute('class', 'kit-backdrop__stars');
  stars.setAttribute('viewBox', '0 0 1000 1000');
  stars.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  for (const star of starField(46)) {
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', String(star.x));
    dot.setAttribute('cy', String(star.y));
    dot.setAttribute('r', String(star.r));
    dot.setAttribute('opacity', String(star.opacity));
    stars.append(dot);
  }
  const root = document.createElement('div');
  root.className = 'kit-backdrop';
  const orbit = document.createElement('div');
  orbit.className = 'kit-backdrop__orbit';
  const horizon = document.createElement('div');
  horizon.className = 'kit-backdrop__horizon';
  root.append(stars, orbit, horizon);
  return root;
}
