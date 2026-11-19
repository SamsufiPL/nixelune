/**
 * Colours of the `lampiony` skin: five blown-glass lanterns on a lacquered raft, by a
 * lake at dusk. Each glass has a ramp from its jewel-dark edge to the colour it takes
 * when the flame inside is lit.
 */
import type { TileColor } from '../../../game/types';

export interface GlassTone {
  /** Outermost glass, where it is thickest and darkest. */
  readonly edge: string;
  readonly deep: string;
  readonly mid: string;
  /** Where the light collects inside the unlit glass. */
  readonly core: string;
  /** Rim light and pale reflections. */
  readonly light: string;
  /** The glass with a flame behind it. */
  readonly lit: string;
  /** Coloured light the glass throws on the bed, as "r,g,b". */
  readonly spill: string;
}

/** jade, vermilion, azure, violet, honey. */
export const GLASS: Readonly<Record<TileColor, GlassTone>> = {
  teal: { edge: '#052A24', deep: '#0B5445', mid: '#149077', core: '#4FE0B4', light: '#B4F7DD', lit: '#3DEBB6', spill: '56,224,176' },
  coral: { edge: '#3A0A07', deep: '#8A1A10', mid: '#D34226', core: '#FF8552', light: '#FFCDB0', lit: '#FF6A3C', spill: '255,112,64' },
  ice: { edge: '#071D38', deep: '#10437E', mid: '#2380D2', core: '#66C8FF', light: '#C9ECFF', lit: '#4FB8FF', spill: '84,180,255' },
  lilac: { edge: '#1C0C38', deep: '#452088', mid: '#7B49D0', core: '#B894FF', light: '#E4D6FF', lit: '#A77BFF', spill: '168,124,255' },
  amber: { edge: '#3A1C02', deep: '#8A4E06', mid: '#DB9414', core: '#FFCD4A', light: '#FFEFB8', lit: '#FFC02E', spill: '255,190,60' },
};

/** Brass of caps, rims and fittings: light, body, shade, deepest line. */
export const BRASS = { light: '#FFE9A8', body: '#D9A441', shade: '#8A5A1C', line: '#3D2408' } as const;

/** The flame: white heart, yellow, orange, ember red. */
export const FLAME = { heart: '#FFFBEA', yellow: '#FFE08A', orange: '#FF9A3C', ember: '#E8501E' } as const;

/** Lacquered wood of the raft. */
export const LACQUER = { top: '#2C151B', base: '#221016', low: '#170A0F', socket: '#0E0609', lip: '#5B2C2A' } as const;

/** Dusk over the lake. */
export const DUSK = {
  zenith: '#1A0F2E',
  plum: '#3B1B4C',
  rose: '#7C2F56',
  ember: '#D9693A',
  gold: '#F6B866',
  moon: '#FFF0C9',
  tealDeep: '#0C2730',
  tealNight: '#081A22',
  ink: '#0A0D14',
} as const;
