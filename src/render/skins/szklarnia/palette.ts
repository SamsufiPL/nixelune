/**
 * Colours of the Glasshouse skin. One light, from the upper right, everywhere: tiles,
 * bed, buttons and the scene share these tones, so nothing looks pasted in.
 */
import type { TileColor } from '../../../game/types';

/** A majolica glaze: a transparent coloured glass over pale relief clay. */
export interface Glaze {
  /** Where the glaze is thinnest and the light strikes it. */
  readonly light: string;
  readonly base: string;
  /** Where it runs thicker, away from the light. */
  readonly deep: string;
  /** Where it pools: against the rim and around the relief. */
  readonly pool: string;
  /** Raised relief seen through thin glaze. */
  readonly relief: string;
}

export const GLAZES: Readonly<Record<TileColor, Glaze>> = {
  // Celadon green.
  teal: { light: '#B9EBCF', base: '#48B088', deep: '#1F7F60', pool: '#0E5744', relief: '#EFFBEF' },
  // Coral red.
  coral: { light: '#FFC4B0', base: '#EC5F4C', deep: '#BE372F', pool: '#84201F', relief: '#FFF1E6' },
  // Delft blue.
  ice: { light: '#BFD6FA', base: '#3B6FD6', deep: '#1E46A6', pool: '#122C73', relief: '#F1F6FF' },
  // Wisteria violet.
  lilac: { light: '#E5D4FA', base: '#A07CDA', deep: '#6E4AB2', pool: '#462C82', relief: '#F8F1FF' },
  // Saffron yellow.
  amber: { light: '#FFEDA8', base: '#F4B224', deep: '#CC7F10', pool: '#8F4F08', relief: '#FFFBE6' },
};

/** Unglazed fired clay of the tile body. */
export const BISCUIT = { lit: '#F3E1C4', mid: '#DDC09A', shade: '#B8956D', line: '#8E6C49' } as const;

export const WORLD = {
  cream: '#FBF6E9',
  enamel: '#FFFDF5',
  stone: '#EFE8DA',
  stoneShade: '#CFC5B2',
  brass: '#C79A3E',
  brassLight: '#F0D488',
  brassDark: '#8A6420',
  green: '#1F5A41',
  greenDeep: '#143E2D',
  ink: '#1B3327',
  terracotta: '#D17B4F',
  sun: '#FFE08A',
} as const;

function channel(hex: string, at: number): number {
  return Number.parseInt(hex.slice(at, at + 2), 16);
}

/** Mix two `#RRGGBB` colours; `t` = 0 gives `a`, 1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  const part = (at: number): string => {
    const value = Math.round(channel(a, at) + (channel(b, at) - channel(a, at)) * k);
    return value.toString(16).padStart(2, '0');
  };
  return `#${part(1)}${part(3)}${part(5)}`;
}

/** `#RRGGBB` with an alpha as an `rgba()` string. */
export function alpha(hex: string, a: number): string {
  return `rgba(${channel(hex, 1)},${channel(hex, 3)},${channel(hex, 5)},${a})`;
}
