/**
 * Geometry of the five gem cuts, in units of the hex radius, centred on the cell
 * (x right, y down). Pure data: the tile painter turns it into shaded facets.
 *
 *   teal   emerald   step cut       tall rectangle with cut corners, three steps
 *   coral  ruby      brilliant      round, octagonal table, star + kite + girdle facets
 *   ice    sapphire  cabochon       wide oval dome, no facets (a six-ray star instead)
 *   lilac  amethyst  rose cut       tall lozenge, triangular facets meeting in an apex
 *   amber  topaz     trillion       triangle with bowed sides, triangular table
 *
 * Every outline stays inside the cell's hexagon (see tests), so neighbouring stones
 * never overlap whatever their colours.
 */
import type { TileColor } from '../../../game/types';

export type Pt = readonly [number, number];

export interface Cut {
  /** Closed silhouette as a dense polygon (smooth outlines are sampled). */
  readonly outline: readonly Pt[];
  /** Crown facets. They may reach a little beyond the outline; the painter clips. */
  readonly facets: readonly (readonly Pt[])[];
  /** The flat top facet, or null for cuts without one. */
  readonly table: readonly Pt[] | null;
  /** Main inner lines that carry the cut at ghost size (drawn as open or closed paths). */
  readonly sketch: readonly (readonly Pt[])[];
  /** Optical centre of the stone. */
  readonly center: Pt;
}

const TAU = Math.PI * 2;

function polar(radius: number, angle: number, cx = 0, cy = 0): Pt {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

function mid(a: Pt, b: Pt, t = 0.5): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function scale(p: Pt, k: number, c: Pt = [0, 0]): Pt {
  return [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k];
}

function at<T>(list: readonly T[], i: number): T {
  const n = list.length;
  return list[((i % n) + n) % n] as T;
}

/** Octagon: rectangle of half-size hw x hh with corners cut by c, clockwise from top-left. */
function octagon(hw: number, hh: number, c: number): Pt[] {
  return [
    [-hw + c, -hh],
    [hw - c, -hh],
    [hw, -hh + c],
    [hw, hh - c],
    [hw - c, hh],
    [-hw + c, hh],
    [-hw, hh - c],
    [-hw, -hh + c],
  ];
}

function stepCut(): Cut {
  const hw = 0.64;
  const hh = 0.8;
  const cut = 0.28;
  // Insetting by d keeps the corner cuts parallel when the cut shrinks by (2 - sqrt 2) d.
  const ring = (d: number): Pt[] => octagon(hw - d, hh - d, Math.max(0.02, cut - d * (2 - Math.SQRT2)));
  const rings = [ring(0), ring(0.12), ring(0.23), ring(0.33)];
  const facets: Pt[][] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const outer = rings[k] as Pt[];
    const inner = rings[k + 1] as Pt[];
    for (let i = 0; i < 8; i++) facets.push([at(outer, i), at(outer, i + 1), at(inner, i + 1), at(inner, i)]);
  }
  const table = rings[3] as Pt[];
  return { outline: rings[0] as Pt[], facets, table, sketch: [[...(rings[1] as Pt[]), at(rings[1] as Pt[], 0)], [...table, at(table, 0)]], center: [0, 0] };
}

function brilliant(): Cut {
  const R = 0.8;
  const outline: Pt[] = [];
  for (let i = 0; i < 48; i++) outline.push(polar(R, (i / 48) * TAU));
  const step = TAU / 8;
  const T: Pt[] = [];
  const S: Pt[] = [];
  const G: Pt[] = [];
  const Gm: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = step * (i + 0.5);
    T.push(polar(R * 0.47, a));
    G.push(polar(R * 1.04, a));
    S.push(polar(R * 0.7, a + step / 2));
    Gm.push(polar(R * 1.04, a + step / 2));
  }
  const facets: Pt[][] = [];
  for (let i = 0; i < 8; i++) {
    facets.push([at(T, i), at(S, i), at(T, i + 1)]);
    facets.push([at(T, i), at(S, i - 1), at(G, i), at(S, i)]);
    facets.push([at(S, i), at(G, i), at(Gm, i)]);
    facets.push([at(S, i), at(Gm, i), at(G, i + 1)]);
  }
  const star: Pt[] = [];
  for (let i = 0; i < 8; i++) star.push(at(T, i), at(S, i));
  return { outline, facets, table: T, sketch: [[...T, at(T, 0)], [...star, at(star, 0)]], center: [0, 0] };
}

function cabochon(): Cut {
  const outline: Pt[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    outline.push([Math.cos(a) * 0.8, Math.sin(a) * 0.63]);
  }
  // The star of a star sapphire: three lines crossing a little towards the light.
  const c: Pt = [-0.08, -0.06];
  const sketch: Pt[][] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI + Math.PI / 2;
    sketch.push([
      [c[0] + Math.cos(a) * 0.42, c[1] + Math.sin(a) * 0.34],
      [c[0] - Math.cos(a) * 0.42, c[1] - Math.sin(a) * 0.34],
    ]);
  }
  return { outline, facets: [], table: null, sketch, center: c };
}

function roseCut(): Cut {
  const top: Pt = [0, -0.93];
  const right: Pt = [0.72, 0];
  const bottom: Pt = [0, 0.93];
  const left: Pt = [-0.72, 0];
  const G: Pt[] = [top, mid(top, right), right, mid(right, bottom), bottom, mid(bottom, left), left, mid(left, top)];
  const I: Pt[] = [];
  for (let i = 0; i < 8; i++) I.push(scale(mid(at(G, i), at(G, i + 1)), 0.5));
  const C: Pt = [0, 0];
  const facets: Pt[][] = [];
  for (let i = 0; i < 8; i++) {
    facets.push([C, at(I, i), at(I, i + 1)]);
    facets.push([at(I, i), at(G, i), at(G, i + 1)]);
    facets.push([at(G, i + 1), at(I, i), at(I, i + 1)]);
  }
  return {
    outline: [top, right, bottom, left],
    facets,
    table: null,
    sketch: [[...I, at(I, 0)], [top, bottom], [left, right]],
    center: C,
  };
}

function trillion(): Cut {
  const cy = 0.08;
  const R = 0.86;
  const bow = 0.17;
  const corners: Pt[] = [];
  for (let i = 0; i < 3; i++) corners.push(polar(R, -Math.PI / 2 + (i * TAU) / 3, 0, cy));
  const center: Pt = [0, cy];
  /** Point at t on the bowed side from corner i to corner i + 1. */
  const side = (i: number, t: number): Pt => {
    const a = at(corners, i);
    const b = at(corners, i + 1);
    const m = mid(a, b);
    const len = Math.hypot(m[0] - center[0], m[1] - center[1]) || 1;
    const ctrl: Pt = [m[0] + ((m[0] - center[0]) / len) * bow, m[1] + ((m[1] - center[1]) / len) * bow];
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1]];
  };
  const outline: Pt[] = [];
  for (let i = 0; i < 3; i++) for (let k = 0; k < 12; k++) outline.push(side(i, k / 12));
  const T: Pt[] = corners.map((p) => scale(p, 0.4, center));
  const facets: Pt[][] = [];
  const out = (p: Pt): Pt => scale(p, 1.05, center);
  for (let i = 0; i < 3; i++) {
    const g = out(at(corners, i));
    const p1 = out(side(i, 0.27));
    const m = out(side(i, 0.5));
    const p3 = out(side(i, 0.73));
    const prev = out(side(i - 1, 0.73));
    facets.push([at(T, i), prev, g]);
    facets.push([at(T, i), g, p1]);
    facets.push([at(T, i), p1, m]);
    facets.push([at(T, i), m, at(T, i + 1)]);
    facets.push([at(T, i + 1), m, p3]);
  }
  return { outline, facets, table: T, sketch: [[...T, at(T, 0)], [at(T, 0), at(corners, 0)], [at(T, 1), at(corners, 1)], [at(T, 2), at(corners, 2)]], center };
}

export const CUTS: Readonly<Record<TileColor, Cut>> = {
  teal: stepCut(),
  coral: brilliant(),
  ice: cabochon(),
  lilac: roseCut(),
  amber: trillion(),
};

/** True if (x, y) lies inside the pointy-top hexagon of radius `radius` around the origin. */
export function insideHex(x: number, y: number, radius: number): boolean {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  return ax <= (Math.sqrt(3) / 2) * radius + 1e-9 && ax / Math.sqrt(3) + ay <= radius + 1e-9;
}

/** Deterministic value in [0, 1) for facet `i` of stone `seed`: the "random" flashes. */
export function facetNoise(i: number, seed: number): number {
  const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
}
