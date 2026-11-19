/**
 * Tile painter: one cut gemstone per colour, painted into a cached sprite, so it can
 * afford real faceting: every facet gets its own shade from its direction to the
 * lamp plus a deterministic "flash", the table carries a window reflection and the
 * pavilion seen through it, the far rim glows with transmitted light, and a sharp
 * star glint sits where the lamp hits. Pure function of its argument.
 */
import type { Ctx2D, TilePaint, TileState } from '../../skin';
import { CUTS, facetNoise, type Cut, type Pt } from './cuts';
import { css, GEMS, IVORY, LIGHT_X, LIGHT_Y, mix, ramp, rgb, type GemTone, type Rgb } from './palette';
import { TILE_COLORS } from '../../../game/types';

/** Paint reaches this far beyond the cell box (shadow, caustic, halo of a lit stone). */
export const GEM_OVERFLOW = { x: 0.24, top: 0.2, bottom: 0.32 } as const;

const WHITE: Rgb = [255, 255, 255];

function trace(ctx: Ctx2D, pts: readonly Pt[], cx: number, cy: number, r: number, close = true, k = 1): void {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i] as Pt;
    if (i === 0) ctx.moveTo(cx + p[0] * r * k, cy + p[1] * r * k);
    else ctx.lineTo(cx + p[0] * r * k, cy + p[1] * r * k);
  }
  if (close) ctx.closePath();
}

/** A four-point star glint with a soft halo, centred on (x, y); `size` is its reach. */
export function paintGlint(ctx: Ctx2D, x: number, y: number, size: number, alpha: number, tint = '255,255,255'): void {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, size * 0.75);
  halo.addColorStop(0, `rgba(${tint},${0.75 * alpha})`);
  halo.addColorStop(0.35, `rgba(${tint},${0.22 * alpha})`);
  halo.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.75, 0, Math.PI * 2);
  ctx.fill();
  const w = size * 0.11;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + w, y - w, x + size, y);
  ctx.quadraticCurveTo(x + w, y + w, x, y + size);
  ctx.quadraticCurveTo(x - w, y + w, x - size, y);
  ctx.quadraticCurveTo(x - w, y - w, x, y - size);
  ctx.fill();
  // Short diagonal rays make it a jeweller's sparkle and not a plus sign.
  const d = size * 0.42;
  const v = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(x - d, y - d);
  ctx.quadraticCurveTo(x + v, y - v, x + d, y + d);
  ctx.quadraticCurveTo(x - v, y + v, x - d, y - d);
  ctx.moveTo(x + d, y - d);
  ctx.quadraticCurveTo(x + v, y + v, x - d, y + d);
  ctx.quadraticCurveTo(x - v, y - v, x + d, y - d);
  ctx.fill();
}

function boostOf(state: TileState): number {
  switch (state) {
    case 'lit':
      return 0.3;
    case 'hint2':
      return 0.09;
    case 'hint1':
      return 0.04;
    case 'active':
      return 0.05;
    default:
      return 0;
  }
}

function paintGhost(p: TilePaint, cut: Cut, tone: GemTone): void {
  const { ctx, cx, cy, r } = p;
  const strong = p.highContrast;
  trace(ctx, cut.outline, cx, cy, r);
  ctx.fillStyle = css(rgb(tone.glow), strong ? 0.2 : 0.13);
  ctx.fill();
  if (strong) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3, r * 0.2);
    ctx.stroke();
  }
  ctx.strokeStyle = strong ? '#FFFFFF' : css(mix(rgb(tone.pale), rgb(tone.light), 0.35), 0.95);
  ctx.lineWidth = Math.max(1.25, r * (strong ? 0.11 : 0.075));
  ctx.stroke();
  ctx.strokeStyle = strong ? css(rgb(tone.pale)) : css(rgb(tone.light), 0.6);
  ctx.lineWidth = Math.max(1, r * (strong ? 0.07 : 0.045));
  for (const line of cut.sketch) {
    trace(ctx, line, cx, cy, r, false);
    ctx.stroke();
  }
}

function paintFacets(p: TilePaint, cut: Cut, tone: GemTone, boost: number): void {
  const { ctx, cx, cy, r, color } = p;
  const seed = TILE_COLORS.indexOf(color) + 1;
  const [ox, oy] = cut.center;
  for (let i = 0; i < cut.facets.length; i++) {
    const facet = cut.facets[i] as readonly Pt[];
    let mx = 0;
    let my = 0;
    for (const q of facet) {
      mx += q[0];
      my += q[1];
    }
    mx /= facet.length;
    my /= facet.length;
    const len = Math.hypot(mx - ox, my - oy) || 1;
    const lam = ((mx - ox) / len) * LIGHT_X + ((my - oy) / len) * LIGHT_Y;
    const n = facetNoise(i, seed);
    // Facing the lamp: reflection. Facing away: light that crossed the stone.
    let v = 0.4 + 0.26 * Math.max(0, lam) + 0.14 * Math.max(0, -lam) + (n - 0.5) * 0.44 + boost;
    if (n > 0.84 && lam > -0.35) v = Math.max(v, 0.9 + boost * 0.3);
    if (n < 0.14) v -= 0.1;
    const x0 = cx + (mx + LIGHT_X * 0.3) * r;
    const y0 = cy + (my + LIGHT_Y * 0.3) * r;
    const x1 = cx + (mx - LIGHT_X * 0.3) * r;
    const y1 = cy + (my - LIGHT_Y * 0.3) * r;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, css(ramp(tone, v + 0.1)));
    g.addColorStop(1, css(ramp(tone, v - 0.1)));
    trace(ctx, facet, cx, cy, r);
    ctx.fillStyle = g;
    ctx.strokeStyle = css(ramp(tone, v));
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fill();
  }
  // Facet edges catch a hairline of light.
  ctx.strokeStyle = `rgba(255,255,255,${p.highContrast ? 0.5 : 0.2})`;
  ctx.lineWidth = Math.max(0.5, r * 0.022);
  for (const facet of cut.facets) {
    trace(ctx, facet, cx, cy, r);
    ctx.stroke();
  }
}

function paintTable(p: TilePaint, cut: Cut, tone: GemTone, boost: number): void {
  const table = cut.table;
  if (!table) return;
  const { ctx, cx, cy, r } = p;
  const [ox, oy] = cut.center;
  const tx = cx + ox * r;
  const ty = cy + oy * r;
  let reach = 0;
  for (const q of table) reach = Math.max(reach, Math.hypot(q[0] - ox, q[1] - oy));
  reach *= r;
  ctx.save();
  trace(ctx, table, cx, cy, r);
  ctx.clip();
  const g = ctx.createLinearGradient(tx + LIGHT_X * reach, ty + LIGHT_Y * reach, tx - LIGHT_X * reach, ty - LIGHT_Y * reach);
  g.addColorStop(0, css(ramp(tone, 0.8 + boost)));
  g.addColorStop(0.55, css(ramp(tone, 0.56 + boost)));
  g.addColorStop(1, css(ramp(tone, 0.42 + boost)));
  ctx.fillStyle = g;
  ctx.fillRect(tx - reach, ty - reach, reach * 2, reach * 2);
  // The pavilion seen through the table: a fan of alternating reflections.
  const n = table.length * 2;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.2;
    const a1 = ((i + 1) / n) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(a0) * reach * 1.5, ty + Math.sin(a0) * reach * 1.5);
    ctx.lineTo(tx + Math.cos(a1) * reach * 1.5, ty + Math.sin(a1) * reach * 1.5);
    ctx.closePath();
    const k = facetNoise(i, 7.3);
    ctx.fillStyle = i % 2 === 0 ? css(rgb(tone.deep), 0.1 + k * 0.22) : css(rgb(tone.pale), 0.06 + k * 0.2);
    ctx.fill();
  }
  // Reflection of the lamp across the table: a soft sheet with one hard edge.
  ctx.translate(tx, ty);
  ctx.rotate(-0.62);
  const sheet = ctx.createLinearGradient(0, -reach, 0, reach * 0.1);
  sheet.addColorStop(0, 'rgba(255,255,255,0.62)');
  sheet.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = sheet;
  ctx.fillRect(-reach * 2, -reach * 2, reach * 4, reach * 1.86);
  ctx.restore();
  trace(ctx, table, cx, cy, r);
  ctx.strokeStyle = `rgba(255,255,255,${p.highContrast ? 0.85 : p.marks ? 0.5 : 0.34})`;
  ctx.lineWidth = Math.max(0.6, r * 0.03);
  ctx.stroke();
}

function paintDome(p: TilePaint, cut: Cut, tone: GemTone, boost: number): void {
  const { ctx, cx, cy, r } = p;
  const body = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.26, r * 0.04, cx - r * 0.05, cy, r * 0.98);
  body.addColorStop(0, css(ramp(tone, 0.74 + boost)));
  body.addColorStop(0.3, css(ramp(tone, 0.52 + boost)));
  body.addColorStop(0.7, css(ramp(tone, 0.26 + boost)));
  body.addColorStop(1, css(ramp(tone, 0.06 + boost)));
  ctx.fillStyle = body;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Light that crossed the dome gathers on the far side.
  ctx.globalCompositeOperation = 'lighter';
  const far = ctx.createRadialGradient(cx + r * 0.34, cy + r * 0.3, 0, cx + r * 0.34, cy + r * 0.3, r * 0.55);
  far.addColorStop(0, css(rgb(tone.glow), 0.8));
  far.addColorStop(0.5, css(rgb(tone.glow), 0.3));
  far.addColorStop(1, css(rgb(tone.glow), 0));
  ctx.fillStyle = far;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over';
  // Asterism: three soft lines of light crossing near the top of the dome.
  const [ox, oy] = cut.center;
  const sx = cx + ox * r;
  const sy = cy + oy * r;
  for (const line of cut.sketch) {
    const a = line[0] as Pt;
    const b = line[1] as Pt;
    const ax = cx + a[0] * r * 1.5 - ox * r * 0.5;
    const ay = cy + a[1] * r * 1.5 - oy * r * 0.5;
    const bx = cx + b[0] * r * 1.5 - ox * r * 0.5;
    const by = cy + b[1] * r * 1.5 - oy * r * 0.5;
    const ray = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.62);
    ray.addColorStop(0, 'rgba(255,255,255,0.95)');
    ray.addColorStop(0.4, css(rgb(tone.pale), 0.5));
    ray.addColorStop(1, css(rgb(tone.pale), 0));
    ctx.strokeStyle = ray;
    ctx.lineWidth = Math.max(0.8, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = r * 0.14;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Gloss: the lamp mirrored on polished stone, soft below, crisp above.
  ctx.save();
  ctx.translate(cx - r * 0.2, cy - r * 0.33);
  ctx.rotate(-0.28);
  const gloss = ctx.createLinearGradient(0, -r * 0.2, 0, r * 0.2);
  gloss.addColorStop(0, 'rgba(255,255,255,0.8)');
  gloss.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42, r * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Paint one gemstone tile. */
export function paintGem(p: TilePaint): void {
  const { ctx, cx, cy, r, color, state } = p;
  const cut = CUTS[color];
  const tone = GEMS[color];
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (state === 'ghost') {
    paintGhost(p, cut, tone);
    ctx.restore();
    return;
  }
  const lit = state === 'lit';
  const boost = boostOf(state);
  const glow = rgb(tone.glow);

  // --- Under the stone: shadow away from the lamp, and the colour it throws ----------
  if (!lit) {
    ctx.save();
    ctx.shadowColor = 'rgba(6,0,3,0.85)';
    ctx.shadowBlur = r * 0.2 * p.dpr;
    trace(ctx, cut.outline, cx + r * 0.07, cy + r * 0.12, r, true, 0.94);
    ctx.fillStyle = 'rgba(8,0,4,0.62)';
    ctx.fill();
    ctx.restore();
    const cast = ctx.createRadialGradient(cx + r * 0.4, cy + r * 0.54, 0, cx + r * 0.4, cy + r * 0.54, r * 0.62);
    cast.addColorStop(0, css(glow, 0.4));
    cast.addColorStop(0.5, css(glow, 0.14));
    cast.addColorStop(1, css(glow, 0));
    ctx.fillStyle = cast;
    ctx.fillRect(cx - r, cy - r, r * 2.2, r * 2.3);
  }
  if (lit || state === 'hint2' || state === 'active') {
    // Halo: the stone itself is a light now (or the piece in hand, rimmed with lamplight).
    ctx.save();
    ctx.shadowColor = state === 'active' ? 'rgba(255,240,205,0.9)' : css(mix(glow, WHITE, lit ? 0.35 : 0), 1);
    ctx.shadowBlur = r * (lit ? 0.3 : state === 'active' ? 0.16 : 0.2) * p.dpr;
    trace(ctx, cut.outline, cx, cy, r);
    ctx.fillStyle = state === 'active' ? IVORY : css(glow);
    ctx.fill();
    if (lit) ctx.fill();
    ctx.restore();
  }

  // --- Girdle: a sliver of thickness below the crown ---------------------------------
  trace(ctx, cut.outline, cx + r * 0.015, cy + r * 0.06, r);
  ctx.fillStyle = css(ramp(tone, 0.12 + boost));
  ctx.fill();

  // --- Crown ---------------------------------------------------------------------------
  ctx.save();
  trace(ctx, cut.outline, cx, cy, r);
  ctx.clip();
  if (cut.facets.length === 0) {
    paintDome(p, cut, tone, boost);
  } else {
    ctx.fillStyle = css(ramp(tone, 0.45 + boost));
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    paintFacets(p, cut, tone, boost);
    paintTable(p, cut, tone, boost);
    // Transmitted light pools on the side away from the lamp.
    ctx.globalCompositeOperation = 'lighter';
    const far = ctx.createRadialGradient(cx + r * 0.3, cy + r * 0.36, 0, cx + r * 0.3, cy + r * 0.36, r * 0.6);
    far.addColorStop(0, css(glow, 0.42));
    far.addColorStop(1, css(glow, 0));
    ctx.fillStyle = far;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (state === 'hint1' || state === 'hint2' || lit) {
    // Light waking inside the stone.
    const [ox, oy] = cut.center;
    ctx.globalCompositeOperation = 'lighter';
    const reach = r * (lit ? 0.95 : 0.6);
    const core = ctx.createRadialGradient(cx + ox * r, cy + oy * r, 0, cx + ox * r, cy + oy * r, reach);
    const a = lit ? 1 : state === 'hint2' ? 0.6 : 0.34;
    core.addColorStop(0, `rgba(255,255,255,${a})`);
    core.addColorStop(0.35, css(mix(glow, WHITE, 0.5), a * 0.6));
    core.addColorStop(1, css(glow, lit ? 0.22 : 0));
    ctx.fillStyle = core;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  // --- Rim: lamplight on the near edge, glow on the far edge ---------------------------
  const rim = ctx.createLinearGradient(cx + LIGHT_X * r * 0.9, cy + LIGHT_Y * r * 0.9, cx - LIGHT_X * r * 0.9, cy - LIGHT_Y * r * 0.9);
  rim.addColorStop(0, 'rgba(255,255,255,0.95)');
  rim.addColorStop(0.38, 'rgba(255,255,255,0.12)');
  rim.addColorStop(0.62, css(rgb(tone.deep), 0.5));
  rim.addColorStop(1, css(mix(glow, WHITE, 0.3), 0.85));
  trace(ctx, cut.outline, cx, cy, r);
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(0.8, r * 0.055);
  ctx.stroke();
  if (p.highContrast) {
    trace(ctx, cut.outline, cx, cy, r, true, 1.04);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.stroke();
  } else if (state === 'active') {
    trace(ctx, cut.outline, cx, cy, r, true, 1.03);
    ctx.strokeStyle = 'rgba(255,246,222,0.95)';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.stroke();
  }

  // --- Glints ----------------------------------------------------------------------------
  let gx = cut.center[0] + LIGHT_X * 0.3;
  let gy = cut.center[1] + LIGHT_Y * 0.3;
  if (cut.table) {
    let best = -Infinity;
    for (const q of cut.table) {
      const d = q[0] * LIGHT_X + q[1] * LIGHT_Y;
      if (d > best) {
        best = d;
        gx = q[0];
        gy = q[1];
      }
    }
  } else if (cut.facets.length === 0) {
    gx = -0.4;
    gy = -0.32;
  }
  if (lit) {
    paintGlint(ctx, cx + cut.center[0] * r, cy + cut.center[1] * r, r * 0.95, 1);
    paintGlint(ctx, cx + gx * r, cy + gy * r, r * 0.4, 1);
  } else {
    paintGlint(ctx, cx + gx * r, cy + gy * r, r * (state === 'normal' ? 0.3 : 0.36), 1);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(cx - gx * r * 0.9, cy - gy * r * 0.9, Math.max(0.6, r * 0.045), 0, Math.PI * 2);
    ctx.fill();
    if (state === 'hint2') paintGlint(ctx, cx - gx * r * 0.9, cy - gy * r * 0.9, r * 0.26, 0.95);
  }
  ctx.restore();
}
