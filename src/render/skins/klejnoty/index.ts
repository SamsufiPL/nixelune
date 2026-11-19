/**
 * Skin `klejnoty` (Jewels): a master jeweller's workshop at night. The tiles are cut
 * gemstones (emerald step cut, ruby brilliant, sapphire cabochon, amethyst rose cut,
 * topaz trillion) lying on a wine-velvet tray framed in brushed gold; behind it the
 * bench under a banker's lamp. One light, from the upper left, for everything.
 */
import '../../../ui/themes/klejnoty.css';
import { defineSkin, type Ctx2D, type PaintEnv } from '../../skin';
import { paintAmbient, paintScene } from './backdrop';
import { paintBed } from './bed';
import { effects } from './effects';
import { createMenuArt } from './menuArt';
import { GEM_OVERFLOW, paintGem } from './tile';

/** A filament of light between stones of a forming group: faint at three, sure at four. */
function paintLink(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, r: number, level: 1 | 2, env: PaintEnv): void {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  if (env.highContrast) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3, r * 0.2);
    ctx.stroke();
  } else if (level === 2) {
    ctx.strokeStyle = 'rgba(255,226,160,0.3)';
    ctx.lineWidth = r * 0.26;
    ctx.stroke();
  }
  ctx.strokeStyle = level === 2 || env.highContrast ? 'rgba(255,250,235,0.95)' : 'rgba(255,244,214,0.6)';
  ctx.lineWidth = Math.max(1, r * (level === 2 ? 0.075 : 0.05));
  ctx.stroke();
}

function paintNode(ctx: Ctx2D, x: number, y: number, r: number, level: 1 | 2): void {
  const s = r * (level === 2 ? 0.2 : 0.14);
  ctx.fillStyle = level === 2 ? '#FFFFFF' : 'rgba(255,248,226,0.85)';
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s, y);
  ctx.closePath();
  ctx.fill();
}

export default defineSkin({
  id: 'klejnoty',
  meta: {
    marks: {
      teal: { shape: 'step-cut', name: { pl: 'szmaragd, szlif schodkowy (prostokąt)', en: 'emerald, step cut (rectangle)' } },
      coral: { shape: 'brilliant', name: { pl: 'rubin, brylant (koło)', en: 'ruby, brilliant (round)' } },
      ice: { shape: 'cabochon', name: { pl: 'szafir, kaboszon (owal)', en: 'sapphire, cabochon (oval)' } },
      lilac: { shape: 'rose-cut', name: { pl: 'ametyst, rozeta (romb)', en: 'amethyst, rose cut (lozenge)' } },
      amber: { shape: 'trillion', name: { pl: 'topaz, trylion (trójkąt)', en: 'topaz, trillion (triangle)' } },
    },
  },
  tile: {
    overflow: GEM_OVERFLOW,
    rowOrder: 'topDown',
    paint: paintGem,
  },
  bed: { pad: 0.7, paint: paintBed },
  links: { paintLink, paintNode },
  backdrop: {
    kind: 'canvas',
    paint: paintScene,
    ambient: { fps: 12, paint: paintAmbient },
  },
  effects,
  ui: {
    themeColor: '#1A0C08',
    menuArt: createMenuArt,
  },
});
