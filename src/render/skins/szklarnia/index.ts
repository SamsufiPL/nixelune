/**
 * SZKLARNIA / GLASSHOUSE - a sunlit Victorian winter garden in the morning.
 *
 * Pieces are majolica tiles: thick hexagons of pale clay under a coloured glaze, each
 * glaze with its own relief (leaf, flower, wave, star, sun). The board is a limestone
 * slab on the potting table, framed in white-painted iron. A path of light is
 * sunlight: a beam runs along the tiles, the glazes flare one after another and the
 * tiles burst into leaves, petals and drops. Light comes from the upper right in
 * every painter and in the theme.
 */
import '../../../ui/themes/szklarnia.css';
import { defineSkin } from '../../skin';
import { paintAmbient, paintScene } from './backdrop';
import { paintBed } from './bed';
import { decorate } from './decor';
import { EFFECTS } from './effects';
import { LINKS } from './links';
import { createMenuArt } from './menuArt';
import { paintTile } from './tile';

export default defineSkin({
  id: 'szklarnia',
  meta: {
    marks: {
      teal: { shape: 'leaf', name: { pl: 'liść', en: 'leaf' } },
      coral: { shape: 'flower', name: { pl: 'kwiat', en: 'flower' } },
      ice: { shape: 'wave', name: { pl: 'fala', en: 'wave' } },
      lilac: { shape: 'star', name: { pl: 'gwiazda', en: 'star' } },
      amber: { shape: 'sun', name: { pl: 'słońce', en: 'sun' } },
    },
  },
  tile: {
    // Room for the contact shadow (lower left), the lifted shadow of the falling
    // piece and the sun's halo round a lit tile.
    overflow: { x: 0.22, top: 0.3, bottom: 0.44 },
    rowOrder: 'topDown',
    paint: paintTile,
  },
  bed: { pad: 0.7, paint: paintBed },
  links: LINKS,
  backdrop: {
    kind: 'canvas',
    paint: paintScene,
    ambient: { fps: 20, paint: paintAmbient },
  },
  effects: EFFECTS,
  ui: {
    themeColor: '#F6F1E3',
    decorate,
    menuArt: createMenuArt,
  },
});
