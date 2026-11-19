/**
 * Skin `kit`: the brand kit look the game shipped with first (flat mineral hexagons on
 * ink navy, thin links, sequential light-up, quiet dispersal). Kept as the reference
 * port of the skin contract; it uses none of the louder effect hooks.
 */
import '../../../ui/themes/kit.css';
import { defineSkin, type Ctx2D, type PaintEnv } from '../../skin';
import { createKitBackdrop } from './backdrop';
import { kitMenuArt } from './menuArt';
import { TEAL, TEXT } from './palette';
import { drawEmptyCell, paintKitTile } from './tile';

/** With tile marks on, a link starts this fraction of the way between two tile centres. */
export const LINK_BRIDGE_INSET = 0.3;

const NO_COLORS: readonly string[] = [];

/**
 * Without tile marks: a line through the tile centres with node dots, as in the
 * mockup. With marks on, the mark is the node, so the link is a short bridge across
 * the joint between two tiles and never overprints it.
 */
function paintLink(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, r: number, level: 1 | 2, env: PaintEnv): void {
  const strong = env.highContrast;
  const inset = env.marks ? LINK_BRIDGE_INSET : 0;
  ctx.globalAlpha = strong ? 1 : level === 2 ? 0.9 : 0.6;
  ctx.strokeStyle = strong ? TEXT : TEAL;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.25, r * (strong ? 0.13 : env.marks ? 0.11 : 0.1));
  const dx = bx - ax;
  const dy = by - ay;
  ctx.beginPath();
  ctx.moveTo(ax + dx * inset, ay + dy * inset);
  ctx.lineTo(ax + dx * (1 - inset), ay + dy * (1 - inset));
  ctx.stroke();
}

function paintNode(ctx: Ctx2D, x: number, y: number, r: number, level: 1 | 2, env: PaintEnv): void {
  if (env.marks || (level === 1 && !env.highContrast)) return;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = TEXT;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.098, 0, Math.PI * 2);
  ctx.fill();
}

export default defineSkin({
  id: 'kit',
  meta: {
    marks: {
      teal: { shape: 'ring', name: { pl: 'pierścień', en: 'ring' } },
      coral: { shape: 'triangle', name: { pl: 'trójkąt', en: 'triangle' } },
      ice: { shape: 'bars', name: { pl: 'dwie kreski', en: 'two bars' } },
      lilac: { shape: 'diamond', name: { pl: 'romb', en: 'diamond' } },
      amber: { shape: 'cross', name: { pl: 'krzyżyk', en: 'cross' } },
    },
  },
  tile: {
    overflow: { x: 0.04, top: 0.04, bottom: 0.04 },
    rowOrder: 'topDown',
    paint: paintKitTile,
  },
  bed: {
    pad: 0.62,
    paint(b) {
      for (let row = 0; row < b.rows; row++) {
        for (let col = 0; col < b.cols; col++) {
          drawEmptyCell(b.ctx, b.cellX(col, row), b.cellY(row), b.r, b.highContrast);
        }
      }
    },
  },
  links: { paintLink, paintNode },
  backdrop: { kind: 'dom', create: createKitBackdrop },
  effects: {
    timing: {
      step: 70,
      spawn: 110,
      hardDrop: 80,
      fallBase: 110,
      fallPerRow: 24,
      fallMax: 200,
      lightUp: 70,
      activation: 240,
      pop: 150,
      popStagger: 60,
    },
    land: { squash: 0, ms: 0, dust: null },
    fall: { bounce: 0, ms: 0 },
    light: { pulse: 0, burst: null, energy: { color: TEXT, width: 0.12, alpha: 0.92 } },
    pop: { scale: 1, burst: null },
    scorePop: null,
    chainBanner: null,
    stageFlourish: null,
    particleColors: () => NO_COLORS,
  },
  ui: {
    themeColor: '#0E1522',
    menuArt: kitMenuArt,
  },
});
