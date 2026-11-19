/**
 * Majolica tiles: a thick hexagon of pale clay with a relief motif, covered by a
 * coloured glaze that thins over the raised parts and pools dark in the hollows and
 * against the rim. Light comes from the upper right: a window is mirrored in the
 * glaze there, the unglazed biscuit edge shows below, the shadow falls to the lower
 * left. Painted once per colour, state and size into a sprite, so nothing here is
 * per frame.
 */
import type { TileColor } from '../../../game/types';
import type { Ctx2D, TilePaint, TileState } from '../../skin';
import { alpha, BISCUIT, GLAZES, mix, WORLD, type Glaze } from './palette';

/** Face radius, thickness and lift of a tile, in units of r. */
export const FACE = 0.9;
export const DEPTH = 0.17;
export const LIFT = 0.07;
const CORNER = 0.17;

/** A pointy-top hexagon with rounded corners. Does not fill or stroke. */
export function roundedHex(ctx: Ctx2D, cx: number, cy: number, radius: number, corner: number): void {
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a0 = (Math.PI / 3) * i - Math.PI / 2;
    const a1 = a0 + Math.PI / 3;
    const x0 = cx + Math.cos(a0) * radius;
    const y0 = cy + Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    if (i === 0) ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
    else ctx.arcTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2, corner);
  }
  ctx.closePath();
}

/**
 * The relief motif of a colour, filled (or, for the wave, stroked) with the current
 * fill and stroke styles. `s` is the motif's outer radius.
 */
export function paintMotif(ctx: Ctx2D, color: TileColor, x: number, y: number, s: number): void {
  ctx.beginPath();
  switch (color) {
    case 'teal': {
      // Leaf: a pointed blade on the diagonal with a short stalk.
      const d = s * 0.74;
      const w = s * 0.62;
      ctx.moveTo(x - d, y + d);
      ctx.bezierCurveTo(x - d - w * 0.2, y + d - w * 1.5, x + d - w * 1.4, y - d - w * 0.35, x + d, y - d);
      ctx.bezierCurveTo(x + d + w * 0.35, y - d + w * 1.4, x - d + w * 1.5, y + d + w * 0.2, x - d, y + d);
      ctx.fill();
      ctx.lineWidth = s * 0.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - d * 0.9, y + d * 0.9);
      ctx.lineTo(x - d * 1.28, y + d * 1.28);
      ctx.stroke();
      break;
    }
    case 'coral': {
      // Flower: five round petals.
      for (let i = 0; i < 5; i++) {
        const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
        const px = x + Math.cos(a) * s * 0.58;
        const py = y + Math.sin(a) * s * 0.58;
        ctx.moveTo(px + s * 0.44, py);
        ctx.arc(px, py, s * 0.44, 0, Math.PI * 2);
      }
      ctx.moveTo(x + s * 0.4, y);
      ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ice': {
      // Wave: two rolling bands.
      ctx.lineWidth = s * 0.36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 2; i++) {
        const wy = y + (i === 0 ? -0.36 : 0.44) * s;
        ctx.moveTo(x - s * 0.92, wy + s * 0.1);
        ctx.bezierCurveTo(x - s * 0.55, wy - s * 0.62, x - s * 0.2, wy - s * 0.42, x, wy);
        ctx.bezierCurveTo(x + s * 0.2, wy + s * 0.42, x + s * 0.55, wy + s * 0.5, x + s * 0.92, wy - s * 0.2);
      }
      ctx.stroke();
      break;
    }
    case 'lilac': {
      // Star: four long points with hollowed sides.
      const long = s * 1.12;
      const waist = s * 0.2;
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i - Math.PI / 2;
        const b = a + Math.PI / 4;
        const tx = x + Math.cos(a) * long;
        const ty = y + Math.sin(a) * long;
        const qx = x + Math.cos(b) * waist * 1.6;
        const qy = y + Math.sin(b) * waist * 1.6;
        const nx = x + Math.cos(a + Math.PI / 2) * long;
        const ny = y + Math.sin(a + Math.PI / 2) * long;
        if (i === 0) ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(qx, qy, nx, ny);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'amber': {
      // Sun: a disc and eight separate rays.
      ctx.moveTo(x + s * 0.5, y);
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const r0 = s * 0.7;
        const r1 = s * 1.14;
        const half = s * 0.17;
        ctx.moveTo(x + ca * r1, y + sa * r1);
        ctx.lineTo(x + ca * r0 - sa * half, y + sa * r0 + ca * half);
        ctx.lineTo(x + ca * r0 + sa * half, y + sa * r0 - ca * half);
        ctx.closePath();
      }
      ctx.fill();
      break;
    }
  }
}

/** Grooves cut into the relief: the leaf's ribs, the flower's eye, the sun's ring. */
function paintMotifDetail(ctx: Ctx2D, color: TileColor, x: number, y: number, s: number, tone: string): void {
  ctx.strokeStyle = tone;
  ctx.fillStyle = tone;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.75, s * 0.1);
  ctx.beginPath();
  switch (color) {
    case 'teal': {
      const d = s * 0.74;
      ctx.moveTo(x - d * 0.82, y + d * 0.82);
      ctx.lineTo(x + d * 0.72, y - d * 0.72);
      if (s > 7) {
        for (let i = 0; i < 2; i++) {
          const k = -0.25 + i * 0.55;
          const mx = x + d * k;
          const my = y - d * k;
          ctx.moveTo(mx, my);
          ctx.lineTo(mx - s * 0.02, my - s * 0.36);
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + s * 0.36, my + s * 0.02);
        }
      }
      ctx.stroke();
      break;
    }
    case 'coral':
      ctx.arc(x, y, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'lilac':
      if (s > 7) {
        ctx.lineWidth = Math.max(0.6, s * 0.07);
        ctx.moveTo(x, y - s * 0.8);
        ctx.lineTo(x, y + s * 0.8);
        ctx.moveTo(x - s * 0.8, y);
        ctx.lineTo(x + s * 0.8, y);
        ctx.stroke();
      }
      break;
    case 'amber':
      ctx.lineWidth = Math.max(0.6, s * 0.08);
      ctx.arc(x, y, s * 0.27, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default:
      break;
  }
}

/** A sash window mirrored in the glaze: four panes, bowed with the surface. */
function paintWindowGloss(ctx: Ctx2D, x: number, y: number, r: number, strength: number): void {
  const w = r * 0.19;
  const h = r * 0.15;
  const gap = Math.max(0.5, r * 0.035);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.5);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  for (let i = 0; i < 4; i++) {
    const px = i % 2 === 0 ? -w - gap / 2 : gap / 2;
    const py = i < 2 ? -h - gap / 2 : gap / 2;
    // The pane nearest the light is the brightest.
    ctx.fillStyle = `rgba(255,255,255,${(i === 1 ? 0.96 : i === 2 ? 0.6 : 0.8) * strength})`;
    ctx.beginPath();
    ctx.roundRect(px, py, w, h, Math.min(w, h) * 0.3);
    ctx.fill();
  }
  ctx.restore();
}

function paintGlint(ctx: Ctx2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x, y, x + size, y);
  ctx.quadraticCurveTo(x, y, x, y + size);
  ctx.quadraticCurveTo(x, y, x - size, y);
  ctx.quadraticCurveTo(x, y, x, y - size);
  ctx.fill();
}

function paintGhost(p: TilePaint, glaze: Glaze): void {
  const { ctx, cx, cy, r, color } = p;
  // A damp print on the stone where the tile will sit: tint, outline, the motif.
  roundedHex(ctx, cx, cy, r * 0.8, r * CORNER);
  ctx.fillStyle = alpha(glaze.base, p.highContrast ? 0.3 : 0.2);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, r * (p.highContrast ? 0.13 : 0.09));
  ctx.strokeStyle = alpha(glaze.deep, p.highContrast ? 1 : 0.9);
  ctx.stroke();
  ctx.fillStyle = alpha(glaze.deep, p.highContrast ? 1 : 0.78);
  ctx.strokeStyle = ctx.fillStyle;
  paintMotif(ctx, color, cx, cy, r * 0.36);
}

/** Lit by the sunbeam: the glaze is lifted towards warm white. */
function litGlaze(glaze: Glaze): Glaze {
  return {
    light: mix(glaze.light, '#FFFFFF', 0.7),
    base: mix(glaze.base, '#FFF6D8', 0.42),
    deep: mix(glaze.deep, glaze.base, 0.55),
    pool: mix(glaze.pool, glaze.base, 0.45),
    relief: '#FFFFFF',
  };
}

export function paintTile(p: TilePaint): void {
  const { ctx, cx, cy, r, color } = p;
  const state: TileState = p.state;
  const base = GLAZES[color];
  if (state === 'ghost') {
    paintGhost(p, base);
    return;
  }
  const lit = state === 'lit';
  const active = state === 'active';
  const glaze = lit ? litGlaze(base) : active ? { ...base, base: mix(base.base, base.light, 0.14) } : base;
  const dpr = p.dpr;
  const face = r * FACE;
  const corner = r * CORNER;
  const fy = cy - r * LIFT;
  const by = fy + r * DEPTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // The sun's halo around a lit tile.
  if (lit) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,214,102,0.95)';
    ctx.shadowBlur = r * 0.3 * dpr;
    roundedHex(ctx, cx, fy + r * DEPTH * 0.5, face, corner);
    ctx.fillStyle = '#FFE9A8';
    ctx.fill();
    ctx.fill();
    ctx.restore();
  }

  // Body of unglazed biscuit, casting the contact shadow to the lower left. A
  // falling tile is held above the bed, so its shadow falls further and softer.
  ctx.save();
  ctx.shadowColor = lit ? 'rgba(120,84,20,0.3)' : active ? 'rgba(52,36,20,0.42)' : 'rgba(52,36,20,0.5)';
  ctx.shadowBlur = r * (active ? 0.3 : 0.16) * dpr;
  ctx.shadowOffsetX = -r * (active ? 0.13 : 0.06) * dpr;
  ctx.shadowOffsetY = r * (active ? 0.22 : 0.09) * dpr;
  const clay = ctx.createLinearGradient(cx - face, 0, cx + face, 0);
  clay.addColorStop(0, BISCUIT.shade);
  clay.addColorStop(0.55, BISCUIT.mid);
  clay.addColorStop(1, BISCUIT.lit);
  roundedHex(ctx, cx, by, face, corner);
  ctx.fillStyle = clay;
  ctx.fill();
  ctx.restore();
  // Firing line at the foot of the body.
  ctx.save();
  roundedHex(ctx, cx, by, face, corner);
  ctx.clip();
  roundedHex(ctx, cx, by - r * 0.045, face, corner);
  ctx.strokeStyle = alpha(BISCUIT.line, 0.55);
  ctx.lineWidth = r * 0.05;
  ctx.stroke();
  ctx.restore();

  // Glaze that ran over the edge and stopped half way down the side.
  roundedHex(ctx, cx, fy + r * DEPTH * 0.48, face, corner);
  const run = ctx.createLinearGradient(cx - face, 0, cx + face, 0);
  run.addColorStop(0, glaze.pool);
  run.addColorStop(1, glaze.deep);
  ctx.fillStyle = run;
  ctx.fill();

  // Face: the glaze, lighter towards the window.
  const body = ctx.createRadialGradient(cx + r * 0.34, fy - r * 0.46, r * 0.05, cx + r * 0.1, fy - r * 0.1, r * 1.25);
  body.addColorStop(0, mix(glaze.base, glaze.light, 0.62));
  body.addColorStop(0.42, glaze.base);
  body.addColorStop(1, glaze.deep);
  roundedHex(ctx, cx, fy, face, corner);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  roundedHex(ctx, cx, fy, face, corner);
  ctx.clip();

  // Glaze pooled against the raised rim.
  ctx.save();
  ctx.shadowColor = alpha(glaze.pool, 0.9);
  ctx.shadowBlur = r * 0.2 * dpr;
  roundedHex(ctx, cx, fy, face + r * 0.04, corner);
  ctx.strokeStyle = alpha(glaze.pool, 0.75);
  ctx.lineWidth = r * 0.12;
  ctx.stroke();
  ctx.restore();
  // The rim itself: glaze breaks thin over the edge and the clay shows through.
  roundedHex(ctx, cx, fy, face - r * 0.035, corner * 0.9);
  ctx.strokeStyle = alpha(glaze.light, 0.55);
  ctx.lineWidth = r * 0.055;
  ctx.stroke();

  // A broad sheen falling in from the window.
  const sheen = ctx.createLinearGradient(cx + r * 0.6, fy - r * 0.85, cx - r * 0.25, fy + r * 0.3);
  sheen.addColorStop(0, 'rgba(255,255,255,0.4)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - r, fy - r, r * 2, r * 2);

  // Relief motif: pooled glaze below and left of it, a lit edge above and right,
  // the raised clay showing pale through the thin glaze.
  const s = r * 0.42;
  const e = Math.max(0.5, r * 0.04);
  const strongMark = p.marks || p.highContrast || lit;
  ctx.save();
  ctx.shadowColor = alpha(glaze.pool, 0.85);
  ctx.shadowBlur = r * 0.1 * dpr;
  ctx.fillStyle = alpha(glaze.pool, strongMark ? 0.85 : 0.6);
  ctx.strokeStyle = ctx.fillStyle;
  paintMotif(ctx, color, cx - e * 0.9, fy + e * 1.15, s);
  ctx.restore();
  if (p.highContrast) {
    // A solid dark surround so the motif reads without relying on the glaze.
    ctx.fillStyle = base.pool;
    ctx.strokeStyle = base.pool;
    paintMotif(ctx, color, cx, fy, s * 1.16);
  }
  ctx.fillStyle = `rgba(255,255,255,${lit ? 1 : 0.85})`;
  ctx.strokeStyle = ctx.fillStyle;
  paintMotif(ctx, color, cx + e * 0.55, fy - e * 0.55, s);
  const raised = strongMark ? mix(glaze.relief, glaze.light, 0.18) : mix(glaze.base, glaze.light, 0.55);
  const raisedShade = strongMark ? mix(glaze.relief, glaze.base, 0.3) : mix(glaze.base, glaze.light, 0.22);
  const clayTone = ctx.createLinearGradient(cx + s, fy - s, cx - s, fy + s);
  clayTone.addColorStop(0, raised);
  clayTone.addColorStop(1, raisedShade);
  ctx.fillStyle = clayTone;
  ctx.strokeStyle = clayTone;
  paintMotif(ctx, color, cx, fy, s);
  paintMotifDetail(ctx, color, cx, fy, s, alpha(lit ? base.base : glaze.deep, strongMark ? 0.7 : 0.5));

  // Light bounced back from the bed along the lower left.
  ctx.beginPath();
  ctx.arc(cx, fy, face * 0.76, Math.PI * 0.62, Math.PI * 0.98);
  ctx.strokeStyle = alpha(glaze.light, 0.32);
  ctx.lineWidth = r * 0.06;
  ctx.stroke();

  paintWindowGloss(ctx, cx + r * 0.36, fy - r * 0.46, r, lit ? 1 : 0.92);
  ctx.restore();

  // Rim light on the edges that face the window, a darker line on those that do not.
  const edge = ctx.createLinearGradient(cx + r * 0.7, fy - r * 0.8, cx - r * 0.7, fy + r * 0.8);
  edge.addColorStop(0, 'rgba(255,255,255,0.85)');
  edge.addColorStop(0.45, 'rgba(255,255,255,0.1)');
  edge.addColorStop(1, alpha(glaze.pool, 0.4));
  roundedHex(ctx, cx, fy, face - r * 0.012, corner);
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(0.75, r * 0.045);
  ctx.stroke();

  if (p.highContrast) {
    roundedHex(ctx, cx, fy, face, corner);
    ctx.strokeStyle = WORLD.ink;
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.stroke();
  }

  if (state === 'hint1' || state === 'hint2') {
    // Sunlight gathering on a forming path: a gilt line inside the rim.
    const strong = state === 'hint2';
    roundedHex(ctx, cx, fy, face - r * 0.1, corner * 0.8);
    ctx.strokeStyle = strong ? 'rgba(255,248,214,0.98)' : 'rgba(255,244,200,0.6)';
    ctx.lineWidth = Math.max(1, r * (strong ? 0.085 : 0.05));
    ctx.stroke();
    if (strong) {
      roundedHex(ctx, cx, fy, face - r * 0.1, corner * 0.8);
      ctx.strokeStyle = alpha(WORLD.brass, 0.55);
      ctx.lineWidth = Math.max(0.5, r * 0.02);
      ctx.stroke();
      paintGlint(ctx, cx + r * 0.36, fy - r * 0.46, r * 0.3, 'rgba(255,255,255,0.95)');
    }
  } else if (active) {
    // The piece in hand: a bright enamel line all round.
    roundedHex(ctx, cx, fy, face, corner);
    ctx.strokeStyle = '#FFFDF2';
    ctx.lineWidth = Math.max(1.5, r * 0.085);
    ctx.stroke();
    roundedHex(ctx, cx, fy, face + r * 0.045, corner);
    ctx.strokeStyle = alpha(base.pool, 0.55);
    ctx.lineWidth = Math.max(0.5, r * 0.025);
    ctx.stroke();
  } else if (lit) {
    // Full flare: the glaze blazes, the window reflection bursts into a star.
    ctx.save();
    roundedHex(ctx, cx, fy, face, corner);
    ctx.clip();
    const flare = ctx.createRadialGradient(cx + r * 0.2, fy - r * 0.25, 0, cx, fy, face);
    flare.addColorStop(0, 'rgba(255,255,244,0.62)');
    flare.addColorStop(0.55, 'rgba(255,246,204,0.26)');
    flare.addColorStop(1, 'rgba(255,236,170,0.05)');
    ctx.fillStyle = flare;
    ctx.fillRect(cx - r, fy - r, r * 2, r * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    paintMotif(ctx, color, cx, fy, s);
    paintMotifDetail(ctx, color, cx, fy, s, alpha(base.base, 0.75));
    ctx.restore();
    roundedHex(ctx, cx, fy, face, corner);
    ctx.strokeStyle = '#FFFBE8';
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.stroke();
    paintGlint(ctx, cx + r * 0.38, fy - r * 0.48, r * 0.46, '#FFFFFF');
  }
}

/**
 * A socket of the bed: a shallow hexagonal recess in the stone. The lip nearest the
 * light throws a shadow into it; the far lip catches the light.
 */
export function paintSocket(ctx: Ctx2D, cx: number, cy: number, r: number, dpr: number, strong: boolean): void {
  const radius = r * 0.9;
  const corner = r * CORNER;
  const well = ctx.createLinearGradient(cx + r * 0.7, cy - r * 0.8, cx - r * 0.7, cy + r * 0.8);
  well.addColorStop(0, '#C9BCA3');
  well.addColorStop(0.5, '#DACFB9');
  well.addColorStop(1, '#E6DCC8');
  roundedHex(ctx, cx, cy, radius, corner);
  ctx.fillStyle = well;
  ctx.fill();
  ctx.save();
  roundedHex(ctx, cx, cy, radius, corner);
  ctx.clip();
  // Inner shadow from the upper right lip.
  ctx.shadowColor = 'rgba(82,62,36,0.55)';
  ctx.shadowBlur = r * 0.2 * dpr;
  ctx.shadowOffsetX = -r * 0.07 * dpr;
  ctx.shadowOffsetY = r * 0.1 * dpr;
  roundedHex(ctx, cx, cy, radius + r * 0.08, corner);
  ctx.strokeStyle = 'rgba(96,74,44,0.6)';
  ctx.lineWidth = r * 0.14;
  ctx.stroke();
  ctx.restore();
  // The lit lower left lip, and a crisp upper right edge.
  const lip = ctx.createLinearGradient(cx + r * 0.7, cy - r * 0.8, cx - r * 0.7, cy + r * 0.8);
  lip.addColorStop(0, strong ? 'rgba(40,30,16,0.9)' : 'rgba(98,76,46,0.5)');
  lip.addColorStop(0.5, strong ? 'rgba(40,30,16,0.9)' : 'rgba(98,76,46,0.12)');
  lip.addColorStop(1, strong ? 'rgba(40,30,16,0.9)' : 'rgba(255,255,255,0.95)');
  roundedHex(ctx, cx, cy, radius + r * 0.01, corner);
  ctx.strokeStyle = lip;
  ctx.lineWidth = Math.max(1, r * (strong ? 0.07 : 0.05));
  ctx.stroke();
}
