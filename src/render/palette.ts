import type { TileColor } from '../game/types';

/** Canvas colours. Values mirror the kit tokens in src/ui/styles/tokens.css. */
export const TILE_FILL: Readonly<Record<TileColor, string>> = {
  teal: '#64D3C1',
  coral: '#F18479',
  ice: '#8DBEF1',
  lilac: '#B5A7E4',
  amber: '#F0BD75',
};

export const INK = '#0E1522';
export const TEXT = '#F2EFE8';
export const BRASS = '#D7AA75';
export const TEAL = '#64D3C1';
/** Empty cell fill and stroke, from the gameplay mockup. */
export const CELL_FILL = '#172535';
export const CELL_STROKE = '#304356';
export const CELL_STROKE_STRONG = '#5B7489';
