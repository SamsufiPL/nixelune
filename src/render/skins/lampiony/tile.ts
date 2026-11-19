/**
 * Tile painter of `lampiony`: blown-glass lanterns seen from above. Light comes from
 * the upper left: the specular sits there, the light that passed through the glass
 * collects at the lower right, and the shadow and coloured spill fall to the lower
 * right on the bed. Every colour has its own outline, cut and cap:
 *   teal   jade     ribbed melon, eight lobes, round cap
 *   coral  vermilion  six flat panels, hexagonal cap
 *   ice    azure    plain round float, open ring
 *   lilac  violet   star-cut, four points, diamond cap
 *   amber  honey    square lantern in a brass lattice, square cap
 * The painter is pure: the engine caches its output as sprites.
 */
import type { TileColor } from '../../../game/types';
import type { Ctx2D, TilePaint, TileState } from '../../skin';
import { BRASS, FLAME, GLASS, type GlassTone } from './palette';

const TAU = Math.PI * 2;
/** Lantern size against the hex radius: leaves a sliver of bed between neighbours. */
export const BODY = 0.83;
/** Unit vector towards the light (upper left). */
const LX = -0.62;
const LY = -0.78;

/** Closed polygon through `n` points with rounded corners; `rad(i)` is the corner radius. */
function roundedPolygon(
  ctx: Ctx2D,
  n: number,
  px: (i: number) => number,
  py: (i: number) => number,
  rad: (i: number) => number,
): void {
  const mx = (px(n - 1) + px(0)) / 2;
  const my = (py(n - 1) + py(0)) / 2;
  ctx.moveTo(mx, my);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.arcTo(px(i), py(i), (px(i) + px(j)) / 2, (py(i) + py(j)) / 2, rad(i));
  }
  ctx.closePath();
}

/** Outline of the lantern of `color` around (cx, cy); `R` is the nominal radius. Begins a new path. */
export function lanternPath(ctx: Ctx2D, color: TileColor, cx: number, cy: number, R: number): void {
  ctx.beginPath();
  switch (color) {
    case 'teal': {
      // Melon: eight round lobes with sharp creases between them.
      const steps = 96;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * TAU;
        const rad = R * (0.9 + 0.12 * Math.pow(Math.abs(Math.cos(4 * a)), 0.75));
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case 'coral': {
      // Hexagon, corners up and down like the cell it sits in.
      const rr = R * 1.07;
      roundedPolygon(
        ctx,
        6,
        (i) => cx + Math.cos(-Math.PI / 2 + (i * TAU) / 6) * rr,
        (i) => cy + Math.sin(-Math.PI / 2 + (i * TAU) / 6) * rr,
        () => R * 0.16,
      );
      break;
    }
    case 'ice':
      ctx.arc(cx, cy, R * 0.99, 0, TAU);
      break;
    case 'lilac': {
      // Four-pointed star with soft tips and hollow sides.
      const tip = R * 1.12;
      const waist = R * 0.68;
      roundedPolygon(
        ctx,
        8,
        (i) => cx + Math.cos(-Math.PI / 2 + (i * TAU) / 8) * (i % 2 === 0 ? tip : waist),
        (i) => cy + Math.sin(-Math.PI / 2 + (i * TAU) / 8) * (i % 2 === 0 ? tip : waist),
        (i) => (i % 2 === 0 ? R * 0.15 : R * 0.5),
      );
      break;
    }
    case 'amber': {
      const h = R * 0.86;
      const q = R * 0.26;
      ctx.roundRect(cx - h, cy - h, h * 2, h * 2, q);
      break;
    }
  }
}

/** The cap on top of the lantern: also the mark that tells the colours apart. Begins a new path. */
function capPath(ctx: Ctx2D, color: TileColor, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  switch (color) {
    case 'teal':
      ctx.arc(cx, cy, s, 0, TAU);
      break;
    case 'coral':
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 6;
        const x = cx + Math.cos(a) * s * 1.12;
        const y = cy + Math.sin(a) * s * 1.12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case 'ice':
      // A ring: the round float is open at the top and shows its core.
      ctx.arc(cx, cy, s * 1.08, 0, TAU);
      ctx.moveTo(cx + s * 0.52, cy);
      ctx.arc(cx, cy, s * 0.52, 0, TAU, true);
      break;
    case 'lilac':
      ctx.moveTo(cx, cy - s * 1.3);
      ctx.lineTo(cx + s * 1.3, cy);
      ctx.lineTo(cx, cy + s * 1.3);
      ctx.lineTo(cx - s * 1.3, cy);
      ctx.closePath();
      break;
    case 'amber':
      ctx.rect(cx - s * 0.92, cy - s * 0.92, s * 1.84, s * 1.84);
      break;
  }
}

function line(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number): void {
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
}

/**
 * The cut of the glass, clipped to the lantern. `dark` and `pale` are the two sides
 * of every groove: against a flame the dark side reads as a silhouette.
 */
function paintCut(ctx: Ctx2D, color: TileColor, cx: number, cy: number, R: number, tone: GlassTone, lit: boolean): void {
  const hair = Math.max(0.6, R * 0.045);
  const dark = lit ? tone.deep : tone.edge;
  const darkAlpha = lit ? 0.7 : 0.55;
  const paleAlpha = lit ? 0.5 : 0.3;
  ctx.lineCap = 'round';
  switch (color) {
    case 'teal': {
      // Ribs run from the cap to the creases; each lobe is lighter on its lit side.
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i * TAU) / 8;
        const mid = a + Math.PI / 8;
        const facing = Math.cos(mid) * LX + Math.sin(mid) * LY;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R * 1.1, a, a + TAU / 8);
        ctx.closePath();
        ctx.fillStyle = facing > 0 ? `rgba(255,255,255,${(facing * 0.1).toFixed(3)})` : `rgba(0,0,0,${(-facing * 0.14).toFixed(3)})`;
        ctx.fill();
      }
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i * TAU) / 8;
        line(ctx, cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      }
      ctx.globalAlpha = darkAlpha;
      ctx.strokeStyle = dark;
      ctx.lineWidth = hair * 1.5;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i * TAU) / 8 + 0.075;
        line(ctx, cx + Math.cos(a) * R * 0.24, cy + Math.sin(a) * R * 0.24, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      }
      ctx.globalAlpha = paleAlpha;
      ctx.strokeStyle = tone.light;
      ctx.lineWidth = hair;
      ctx.stroke();
      break;
    }
    case 'coral': {
      // Six flat panes: each takes the light by how it faces it.
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 6;
        const b = a + TAU / 6;
        const mid = a + TAU / 12;
        const facing = Math.cos(mid) * LX + Math.sin(mid) * LY;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * R * 1.3);
        ctx.lineTo(cx + Math.cos(b) * R * 1.3, cy + Math.sin(b) * R * 1.3);
        ctx.closePath();
        const k = lit ? 0.5 : 1;
        ctx.fillStyle = facing > 0 ? `rgba(255,255,255,${(facing * 0.2 * k).toFixed(3)})` : `rgba(0,0,0,${(-facing * 0.26 * k).toFixed(3)})`;
        ctx.fill();
      }
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 6;
        line(ctx, cx, cy, cx + Math.cos(a) * R * 1.1, cy + Math.sin(a) * R * 1.1);
      }
      ctx.globalAlpha = darkAlpha;
      ctx.strokeStyle = dark;
      ctx.lineWidth = hair * 1.5;
      ctx.stroke();
      // An inner pane line, parallel to the outline.
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 6;
        const x = cx + Math.cos(a) * R * 0.66;
        const y = cy + Math.sin(a) * R * 0.66;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = paleAlpha * 0.8;
      ctx.strokeStyle = tone.light;
      ctx.lineWidth = hair;
      ctx.stroke();
      break;
    }
    case 'ice': {
      // Plain float: one soft band where the glass turns, and two bubbles.
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.66, 0, TAU);
      ctx.globalAlpha = paleAlpha * 0.6;
      ctx.strokeStyle = tone.light;
      ctx.lineWidth = hair * 1.2;
      ctx.stroke();
      ctx.globalAlpha = paleAlpha;
      ctx.fillStyle = tone.light;
      ctx.beginPath();
      ctx.arc(cx + R * 0.5, cy - R * 0.3, R * 0.07, 0, TAU);
      ctx.arc(cx - R * 0.22, cy + R * 0.58, R * 0.05, 0, TAU);
      ctx.fill();
      break;
    }
    case 'lilac': {
      // Star cut: eight facets meet at the cap, alternately in light and in shade.
      const tip = R * 1.2;
      const waist = R * 0.78;
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 8;
        const b = a + TAU / 8;
        const ra = i % 2 === 0 ? tip : waist;
        const rb = i % 2 === 0 ? waist : tip;
        const mid = a + TAU / 16;
        const facing = Math.cos(mid) * LX + Math.sin(mid) * LY + (i % 2 === 0 ? 0.35 : -0.35);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * ra, cy + Math.sin(a) * ra);
        ctx.lineTo(cx + Math.cos(b) * rb, cy + Math.sin(b) * rb);
        ctx.closePath();
        const k = lit ? 0.5 : 1;
        ctx.fillStyle = facing > 0 ? `rgba(255,255,255,${(facing * 0.17 * k).toFixed(3)})` : `rgba(0,0,0,${(-facing * 0.22 * k).toFixed(3)})`;
        ctx.fill();
      }
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 8;
        const rad = i % 2 === 0 ? tip : waist;
        line(ctx, cx, cy, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      ctx.globalAlpha = darkAlpha;
      ctx.strokeStyle = dark;
      ctx.lineWidth = hair * 1.2;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 8; i += 2) {
        const a = -Math.PI / 2 + (i * TAU) / 8 - 0.06;
        line(ctx, cx, cy, cx + Math.cos(a) * tip, cy + Math.sin(a) * tip);
      }
      ctx.globalAlpha = paleAlpha;
      ctx.strokeStyle = tone.light;
      ctx.lineWidth = hair;
      ctx.stroke();
      break;
    }
    case 'amber': {
      // Brass lattice over the glass: a net of diamonds.
      const step = R * 0.68;
      ctx.beginPath();
      for (let k = -3; k <= 3; k++) {
        const o = (k + 0.5) * step;
        line(ctx, cx + o - R * 1.2, cy - R * 1.2, cx + o + R * 1.2, cy + R * 1.2);
        line(ctx, cx + o + R * 1.2, cy - R * 1.2, cx + o - R * 1.2, cy + R * 1.2);
      }
      ctx.globalAlpha = lit ? 0.85 : 0.7;
      ctx.strokeStyle = lit ? '#6B3A08' : BRASS.line;
      ctx.lineWidth = hair * 2.1;
      ctx.stroke();
      ctx.save();
      ctx.translate(-hair * 0.45, -hair * 0.45);
      ctx.globalAlpha = lit ? 0.5 : 0.65;
      ctx.strokeStyle = lit ? BRASS.body : BRASS.light;
      ctx.lineWidth = hair * 0.7;
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
  ctx.globalAlpha = 1;
}

function paintCap(ctx: Ctx2D, p: TilePaint, R: number, lit: boolean): void {
  const { cx, cy, color } = p;
  const s = R * (p.marks ? 0.27 : 0.2) * (p.highContrast ? 1.15 : 1);
  const hair = Math.max(0.75, R * 0.05);
  // The cap stands a little above the glass: a soft shadow to the lower right.
  capPath(ctx, color, cx + R * 0.04, cy + R * 0.07, s * 1.08);
  ctx.fillStyle = 'rgba(10,3,6,0.5)';
  ctx.fill('evenodd');
  capPath(ctx, color, cx, cy, s);
  const brass = ctx.createLinearGradient(cx + LX * s, cy + LY * s, cx - LX * s, cy - LY * s);
  if (lit) {
    // Against the flame the metal is a dark shape with a hot edge.
    brass.addColorStop(0, '#7A4A12');
    brass.addColorStop(1, '#2E1604');
  } else {
    brass.addColorStop(0, BRASS.light);
    brass.addColorStop(0.45, BRASS.body);
    brass.addColorStop(1, BRASS.shade);
  }
  ctx.fillStyle = brass;
  ctx.fill('evenodd');
  ctx.lineJoin = 'round';
  ctx.lineWidth = p.highContrast ? hair * 1.8 : hair;
  ctx.strokeStyle = lit ? FLAME.yellow : BRASS.line;
  ctx.stroke();
  if (!lit) {
    // A bead of light on the metal.
    ctx.beginPath();
    ctx.arc(cx + LX * s * 0.55, cy + LY * s * 0.55, Math.max(0.6, s * 0.2), 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  }
}

function paintGhost(p: TilePaint, R: number): void {
  const { ctx, cx, cy, r, color } = p;
  const tone = GLASS[color];
  lanternPath(ctx, color, cx, cy, R * 0.94);
  ctx.fillStyle = `rgba(${tone.spill},${p.highContrast ? 0.2 : 0.13})`;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.25, r * (p.highContrast ? 0.13 : 0.085));
  ctx.strokeStyle = p.highContrast ? '#FFFFFF' : tone.light;
  ctx.globalAlpha = p.highContrast ? 1 : 0.9;
  ctx.stroke();
  capPath(ctx, color, cx, cy, R * 0.24);
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** How strongly the flame shows through, per state: 0 none, 1 a full flame. */
function flameOf(state: TileState): number {
  switch (state) {
    case 'hint1':
      return 0.46;
    case 'hint2':
      return 0.72;
    case 'lit':
      return 1;
    default:
      return 0;
  }
}

export function paintLantern(p: TilePaint): void {
  const { ctx, cx, cy, r, color, state, dpr } = p;
  const tone = GLASS[color];
  const R = r * BODY;
  if (state === 'ghost') {
    paintGhost(p, R);
    return;
  }
  const lit = state === 'lit';
  const active = state === 'active';
  const flame = flameOf(state);

  // --- On the bed: light thrown through the glass, then the shadow -------------------
  if (lit) {
    const halo = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, r * 1.2);
    halo.addColorStop(0, 'rgba(255,214,140,0.75)');
    halo.addColorStop(0.45, `rgba(${tone.spill},0.42)`);
    halo.addColorStop(1, `rgba(${tone.spill},0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 1.25, cy - r * 1.25, r * 2.5, r * 2.5);
  } else {
    ctx.save();
    ctx.shadowColor = active ? 'rgba(4,1,6,0.7)' : 'rgba(4,1,6,0.62)';
    ctx.shadowBlur = r * (active ? 0.3 : 0.2) * dpr;
    ctx.shadowOffsetX = r * (active ? 0.1 : 0.06) * dpr;
    ctx.shadowOffsetY = r * (active ? 0.22 : 0.13) * dpr;
    lanternPath(ctx, color, cx, cy, R * 0.96);
    ctx.fillStyle = tone.edge;
    ctx.fill();
    ctx.restore();
    const sx = cx + r * 0.16;
    const sy = cy + r * 0.24;
    const spill = ctx.createRadialGradient(sx, sy, R * 0.3, sx, sy, r * 1.02);
    const strength = 0.3 + flame * 0.35;
    spill.addColorStop(0, `rgba(${tone.spill},${strength.toFixed(3)})`);
    spill.addColorStop(1, `rgba(${tone.spill},0)`);
    ctx.fillStyle = spill;
    ctx.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.6);
  }

  // --- The glass ---------------------------------------------------------------------
  lanternPath(ctx, color, cx, cy, R);
  let body: CanvasGradient;
  if (lit) {
    body = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 1.1);
    body.addColorStop(0, FLAME.heart);
    body.addColorStop(0.2, FLAME.yellow);
    body.addColorStop(0.5, tone.lit);
    body.addColorStop(0.84, tone.mid);
    body.addColorStop(1, tone.deep);
  } else {
    // The light that got through gathers opposite the highlight.
    const gx = cx - LX * R * 0.3;
    const gy = cy - LY * R * 0.3;
    body = ctx.createRadialGradient(gx, gy, R * 0.04, cx, cy, R * 1.08);
    body.addColorStop(0, active ? tone.light : tone.core);
    body.addColorStop(active ? 0.32 : 0.26, active ? tone.core : tone.mid);
    body.addColorStop(0.7, active ? tone.mid : tone.deep);
    body.addColorStop(1, tone.edge);
  }
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  lanternPath(ctx, color, cx, cy, R);
  ctx.clip();
  paintCut(ctx, color, cx, cy, R, tone, lit);

  // Thickness of the glass: a dark band inside the outline, lighter where light leaves.
  ctx.lineJoin = 'round';
  lanternPath(ctx, color, cx, cy, R);
  ctx.lineWidth = R * 0.24;
  ctx.strokeStyle = lit ? `rgba(${tone.spill},0.25)` : 'rgba(3,1,8,0.34)';
  ctx.stroke();
  const out = ctx.createLinearGradient(cx + LX * R, cy + LY * R, cx - LX * R, cy - LY * R);
  out.addColorStop(0, 'rgba(255,255,255,0)');
  out.addColorStop(0.55, 'rgba(255,255,255,0)');
  out.addColorStop(1, lit ? 'rgba(255,255,255,0.75)' : `rgba(${tone.spill},0.95)`);
  lanternPath(ctx, color, cx, cy, R * 0.9);
  ctx.lineWidth = R * 0.11;
  ctx.strokeStyle = out;
  ctx.stroke();

  // The flame, seen through the glass.
  if (flame > 0 && !lit) {
    const reach = R * (0.35 + flame * 0.75);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
    glow.addColorStop(0, `rgba(255,244,214,${(0.55 + flame * 0.4).toFixed(3)})`);
    glow.addColorStop(0.35, `rgba(255,196,96,${(0.3 + flame * 0.35).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(cx - reach, cy - reach, reach * 2, reach * 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Specular: a soft sheen, then the crisp window of the highlight on top of it.
  const hx = cx + LX * R * 0.5;
  const hy = cy + LY * R * 0.5;
  const sheen = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.62);
  sheen.addColorStop(0, `rgba(255,255,255,${lit ? 0.3 : 0.42})`);
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();

  // Rim: the edge of the glass catches the light all round, most on the lit side.
  const rim = ctx.createLinearGradient(cx + LX * R, cy + LY * R, cx - LX * R, cy - LY * R);
  rim.addColorStop(0, lit ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)');
  rim.addColorStop(0.4, lit ? `rgba(${tone.spill},0.9)` : `rgba(${tone.spill},0.3)`);
  rim.addColorStop(1, lit ? `rgba(${tone.spill},0.9)` : `rgba(${tone.spill},0.55)`);
  ctx.lineJoin = 'round';
  lanternPath(ctx, color, cx, cy, R - Math.max(0.4, r * 0.025));
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.strokeStyle = rim;
  ctx.stroke();

  paintCap(ctx, p, R, lit);

  // The window of the highlight: crisp, bean-shaped, turned to the light.
  ctx.save();
  ctx.translate(cx + LX * R * 0.56, cy + LY * R * 0.56);
  ctx.rotate(Math.atan2(LY, LX) + Math.PI / 2);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.27, R * 0.1, 0, 0, TAU);
  ctx.fillStyle = `rgba(255,255,255,${lit ? 0.7 : 0.92})`;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx + R * 0.02, cy - R * 0.72, Math.max(0.5, R * 0.05), 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();

  if (active) {
    // The piece in hand: a clear pale outline, so it reads over any neighbour.
    lanternPath(ctx, color, cx, cy, R + Math.max(0.5, r * 0.03));
    ctx.lineWidth = Math.max(1.25, r * 0.075);
    ctx.strokeStyle = 'rgba(255,246,224,0.95)';
    ctx.stroke();
  }
  if (p.highContrast) {
    lanternPath(ctx, color, cx, cy, R);
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  }
}
