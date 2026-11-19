/** Colours of the five stones and of the workshop. Light comes from the upper left. */
import type { TileColor } from '../../../game/types';

export interface GemTone {
  /** Shadow inside the stone, almost black. */
  readonly deep: string;
  readonly dark: string;
  readonly base: string;
  readonly light: string;
  readonly pale: string;
  /** Saturated light the stone throws and glows with. */
  readonly glow: string;
}

export const GEMS: Readonly<Record<TileColor, GemTone>> = {
  // emerald
  teal: { deep: '#02261D', dark: '#086148', base: '#12AE7C', light: '#63E6B4', pale: '#CFFBE6', glow: '#2CF2A6' },
  // ruby
  coral: { deep: '#3A0210', dark: '#960B29', base: '#E8243F', light: '#FF7C86', pale: '#FFD9D6', glow: '#FF4466' },
  // sapphire
  ice: { deep: '#041345', dark: '#1239A6', base: '#2E72F0', light: '#84B9FF', pale: '#DCEBFF', glow: '#4F9BFF' },
  // amethyst
  lilac: { deep: '#1D073C', dark: '#5722A2', base: '#9A55E6', light: '#CBA0FF', pale: '#F0E0FF', glow: '#BE78FF' },
  // topaz
  amber: { deep: '#4C1D00', dark: '#B55F06', base: '#F7A81C', light: '#FFD970', pale: '#FFF5CC', glow: '#FFC53A' },
};

/** Direction towards the lamp (upper left), unit length. */
export const LIGHT_X = -0.6;
export const LIGHT_Y = -0.8;

export const IVORY = '#F6ECD6';
export const GOLD = '#E3BA6B';
export const GOLD_PALE = '#FBE7B0';
export const GOLD_DEEP = '#8A5F1F';
export const VELVET = '#3A0B1B';
export const VELVET_DEEP = '#1C040C';
export const WOOD_DARK = '#1B0D09';

export type Rgb = readonly [number, number, number];

export function rgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

export function css(c: Rgb, alpha = 1): string {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

const WHITE: Rgb = [255, 255, 255];

/**
 * Colour of a stone at brightness `v` (0 = deepest shadow, 1 = white flash): a ramp
 * through deep, dark, base, light, pale.
 */
export function ramp(tone: GemTone, v: number): Rgb {
  const stops: readonly (readonly [number, Rgb])[] = [
    [0, rgb(tone.deep)],
    [0.26, rgb(tone.dark)],
    [0.5, rgb(tone.base)],
    [0.72, rgb(tone.light)],
    [0.9, rgb(tone.pale)],
    [1, WHITE],
  ];
  const x = v < 0 ? 0 : v > 1 ? 1 : v;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1] as readonly [number, Rgb];
    const b = stops[i] as readonly [number, Rgb];
    if (x <= b[0]) return mix(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
  }
  return WHITE;
}
