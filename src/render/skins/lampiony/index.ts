/**
 * Skin `lampiony` (Lanterns): a lantern festival on a warm night by the water. The
 * pieces are blown-glass lanterns seen from above, the board is a tray of dark
 * lacquered wood with carved sockets, the interface is lacquer, brass and paper, and
 * a path of light is lanterns being lit.
 */
import '../../../ui/themes/lampiony.css';
import { defineSkin } from '../../skin';
import { AMBIENT_FPS, paintAmbient, paintScene } from './backdrop';
import { paintBed } from './bed';
import { EFFECTS } from './effects';
import { paintLantern } from './tile';
import { decorate, menuArt } from './ui';

export default defineSkin({
  id: 'lampiony',
  meta: {
    marks: {
      teal: { shape: 'ribbed', name: { pl: 'żebrowany lampion z okrągłą nasadką', en: 'ribbed lantern with a round cap' } },
      coral: { shape: 'panelled', name: { pl: 'sześcioboczny lampion', en: 'six-sided lantern' } },
      ice: { shape: 'round', name: { pl: 'okrągła kula z pierścieniem', en: 'round float with a ring' } },
      lilac: { shape: 'star', name: { pl: 'lampion w kształcie gwiazdy', en: 'star-cut lantern' } },
      amber: { shape: 'lattice', name: { pl: 'kwadratowy lampion w kratce', en: 'square lantern in a lattice' } },
    },
  },
  tile: {
    // Room for the shadow to the lower right and for the halo of a lit lantern.
    overflow: { x: 0.24, top: 0.22, bottom: 0.38 },
    rowOrder: 'topDown',
    paint: paintLantern,
  },
  bed: { pad: 0.55, paint: paintBed },
  links: {
    // A cord from cap to cap: thin for three lanterns, taut and bright for four.
    paintLink(ctx, ax, ay, bx, by, r, level, env) {
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const inset = (r * 0.3) / len;
      const x0 = ax + dx * inset;
      const y0 = ay + dy * inset;
      const x1 = bx - dx * inset;
      const y1 = by - dy * inset;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = 'rgba(30,10,8,0.6)';
      ctx.lineWidth = Math.max(2, r * (level === 2 ? 0.2 : 0.15));
      ctx.stroke();
      ctx.strokeStyle = level === 2 || env.highContrast ? '#FFE9B0' : '#D9A441';
      ctx.lineWidth = Math.max(1, r * (level === 2 ? 0.1 : 0.06));
      ctx.stroke();
    },
  },
  backdrop: { kind: 'canvas', paint: paintScene, ambient: { fps: AMBIENT_FPS, paint: paintAmbient } },
  effects: EFFECTS,
  ui: { themeColor: '#1A0F2E', decorate, menuArt },
});
