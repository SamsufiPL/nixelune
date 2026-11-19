/**
 * The world: a Victorian glasshouse on a bright morning. Painted once per screen size
 * as a layered illustration - sky and garden beyond the glass, the white iron nave
 * with its fanlight, hazy palms in the middle distance, a tiled floor, sunbeams from
 * the upper right, and potted ferns and hanging baskets in the foreground corners.
 * The centre, where the board and the texts sit, is kept pale and quiet.
 *
 * The ambient layer adds only dust motes in the beams and one white butterfly.
 */
import type { Ctx2D, PaintEnv } from '../../skin';
import { seeded } from './bed';

const TAU = Math.PI * 2;

export interface Greens {
  readonly light: string;
  readonly dark: string;
  readonly stem: string;
}

const FAR: Greens = { light: '#B9D6C3', dark: '#9CC2AF', stem: '#8FB5A2' };
const MID: Greens = { light: '#8FC49B', dark: '#62A680', stem: '#57977A' };
export const NEAR: Greens = { light: '#5FB36E', dark: '#2E8257', stem: '#2A6E4C' };
export const DEEP: Greens = { light: '#3F9A62', dark: '#1F6A4A', stem: '#1B5A40' };

// --- Plants ------------------------------------------------------------------------

/**
 * A pinnate frond: a curved rib with leaflets on both sides. The side that faces the
 * light (upper right) is painted in the light green, the other in the dark one.
 */
function frond(
  ctx: Ctx2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  leaf: number,
  count: number,
  tone: Greens,
): void {
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    let lit = 0;
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const u = 1 - t;
      const px = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const py = u * u * y0 + 2 * u * t * cy + t * t * y1;
      const tx = 2 * u * (cx - x0) + 2 * t * (x1 - cx);
      const ty = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
      const angle = Math.atan2(ty, tx) + side * (1.2 - 0.6 * t);
      const length = leaf * Math.pow(Math.sin(Math.PI * (0.1 + 0.86 * t)), 0.75);
      const ex = px + Math.cos(angle) * length;
      const ey = py + Math.sin(angle) * length + length * 0.18;
      const mx = (px + ex) / 2;
      const my = (py + ey) / 2;
      const nx = -(ey - py) * 0.16;
      const ny = (ex - px) * 0.16;
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(mx + nx, my + ny, ex, ey);
      ctx.quadraticCurveTo(mx - nx, my - ny, px, py);
      lit += Math.cos(angle) * 0.6 - Math.sin(angle) * 0.8;
    }
    ctx.fillStyle = lit > 0 ? tone.light : tone.dark;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.strokeStyle = tone.stem;
  ctx.lineWidth = Math.max(0.8, leaf * 0.07);
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** A fan of fronds from one crown: a palm head, a fern, a basket. */
export function crown(
  ctx: Ctx2D,
  x: number,
  y: number,
  reach: number,
  from: number,
  to: number,
  count: number,
  droop: number,
  tone: Greens,
  rnd: () => number,
): void {
  // Outer fronds first so the upright ones overlap them.
  for (let k = 0; k < count; k++) {
    const order = k % 2 === 0 ? k / 2 : count - 1 - (k - 1) / 2;
    const f = count === 1 ? 0.5 : order / (count - 1);
    const angle = from + (to - from) * f + (rnd() - 0.5) * 0.12;
    const length = reach * (0.78 + rnd() * 0.3);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const sag = droop * length * (0.5 + Math.abs(dx) * 0.9);
    frond(
      ctx,
      x,
      y,
      x + dx * length * 0.55,
      y + dy * length * 0.55 - length * 0.22,
      x + dx * length,
      y + dy * length + sag,
      length * 0.2,
      Math.round(11 + length / 14),
      tone,
    );
  }
}

/** A broad paddle leaf (banana, canna): outline, shaded half, midrib and veins. */
export function paddle(ctx: Ctx2D, x0: number, y0: number, angle: number, length: number, width: number, bend: number, tone: Greens): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const x1 = x0 + dx * length + bend * length * 0.3;
  const y1 = y0 + dy * length + Math.abs(bend) * length * 0.25;
  const cx = x0 + dx * length * 0.55;
  const cy = y0 + dy * length * 0.55 - Math.abs(bend) * length * 0.1;
  const steps = 14;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const px = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const py = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const tx = 2 * u * (cx - x0) + 2 * t * (x1 - cx);
    const ty = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
    const norm = Math.hypot(tx, ty) || 1;
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + t * 0.94)), 0.62) * (1 - 0.28 * t);
    left.push(px - (ty / norm) * w, py + (tx / norm) * w);
    right.push(px + (ty / norm) * w, py - (tx / norm) * w);
  }
  const outline = (): void => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let i = 0; i <= steps; i++) ctx.lineTo(left[i * 2] ?? 0, left[i * 2 + 1] ?? 0);
    ctx.lineTo(x1, y1);
    for (let i = steps; i >= 0; i--) ctx.lineTo(right[i * 2] ?? 0, right[i * 2 + 1] ?? 0);
    ctx.closePath();
  };
  outline();
  ctx.fillStyle = tone.dark;
  ctx.fill();
  ctx.save();
  outline();
  ctx.clip();
  // The half that faces the light.
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  const rightFacesLight = dy * 0.6 + dx * 0.8 > 0 ? right : left;
  const upper = -dx * 0.8 + dy * 0.6 < 0 ? right : left;
  const litSide = Math.abs(dx) > 0.5 ? upper : rightFacesLight;
  for (let i = steps; i >= 0; i--) ctx.lineTo(litSide[i * 2] ?? 0, litSide[i * 2 + 1] ?? 0);
  ctx.closePath();
  ctx.fillStyle = tone.light;
  ctx.fill();
  // Veins.
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = Math.max(0.6, width * 0.035);
  ctx.beginPath();
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const px = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const py = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const back = Math.max(0, i - 1);
    ctx.moveTo(px, py);
    ctx.lineTo(left[back * 2] ?? px, left[back * 2 + 1] ?? py);
    ctx.moveTo(px, py);
    ctx.lineTo(right[back * 2] ?? px, right[back * 2 + 1] ?? py);
  }
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.strokeStyle = tone.stem;
  ctx.lineWidth = Math.max(0.8, width * 0.09);
  ctx.lineCap = 'round';
  ctx.stroke();
}

function palm(ctx: Ctx2D, x: number, footY: number, topX: number, topY: number, reach: number, tone: Greens, rnd: () => number): void {
  // Trunk: tapered, ringed, lit from the right.
  const w0 = reach * 0.11;
  const w1 = reach * 0.07;
  const bendX = (x + topX) / 2 + (topX - x) * 0.35;
  const bendY = (footY + topY) / 2;
  ctx.beginPath();
  ctx.moveTo(x - w0, footY);
  ctx.quadraticCurveTo(bendX - w0, bendY, topX - w1, topY);
  ctx.lineTo(topX + w1, topY);
  ctx.quadraticCurveTo(bendX + w0, bendY, x + w0, footY);
  ctx.closePath();
  const bark = ctx.createLinearGradient(Math.min(x, topX) - w0, 0, Math.max(x, topX) + w0, 0);
  bark.addColorStop(0, tone === FAR ? '#B7B9A6' : '#8C7A5E');
  bark.addColorStop(1, tone === FAR ? '#D7D6C2' : '#C9B48C');
  ctx.fillStyle = bark;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = tone === FAR ? 'rgba(140,146,128,0.4)' : 'rgba(92,72,48,0.4)';
  ctx.lineWidth = Math.max(0.7, reach * 0.012);
  ctx.beginPath();
  const rings = Math.round((footY - topY) / (reach * 0.075));
  for (let i = 1; i < rings; i++) {
    const t = i / rings;
    const u = 1 - t;
    const px = u * u * x + 2 * u * t * bendX + t * t * topX;
    const py = u * u * footY + 2 * u * t * bendY + t * t * topY;
    ctx.moveTo(px - w0 * 1.2, py - w0 * 0.25);
    ctx.quadraticCurveTo(px, py + w0 * 0.5, px + w0 * 1.2, py - w0 * 0.25);
  }
  ctx.stroke();
  ctx.restore();
  crown(ctx, topX, topY, reach, Math.PI * 1.02, Math.PI * 1.98, 9, 0.5, tone, rnd);
  crown(ctx, topX, topY - reach * 0.02, reach * 0.78, Math.PI * 1.2, Math.PI * 1.8, 5, 0.25, { ...tone, dark: tone.light }, rnd);
}

/** A terracotta pot standing on the floor, lit from the right. */
export function pot(ctx: Ctx2D, x: number, footY: number, w: number): void {
  const h = w * 0.86;
  const top = footY - h;
  // Contact shadow thrown to the left.
  const shadow = ctx.createRadialGradient(x - w * 0.25, footY, 0, x - w * 0.25, footY, w * 0.95);
  shadow.addColorStop(0, 'rgba(70,52,34,0.34)');
  shadow.addColorStop(1, 'rgba(70,52,34,0)');
  ctx.save();
  ctx.translate(0, footY);
  ctx.scale(1, 0.22);
  ctx.translate(0, -footY);
  ctx.fillStyle = shadow;
  ctx.fillRect(x - w * 1.4, footY - w, w * 2.6, w * 2);
  ctx.restore();
  const clay = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  clay.addColorStop(0, '#9A4C2F');
  clay.addColorStop(0.45, '#CC7449');
  clay.addColorStop(0.8, '#EBA47A');
  clay.addColorStop(1, '#D98A5E');
  ctx.fillStyle = clay;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.46, top + h * 0.16);
  ctx.lineTo(x + w * 0.46, top + h * 0.16);
  ctx.lineTo(x + w * 0.33, footY - h * 0.03);
  ctx.quadraticCurveTo(x, footY + h * 0.05, x - w * 0.33, footY - h * 0.03);
  ctx.closePath();
  ctx.fill();
  // Shade under the rim.
  const under = ctx.createLinearGradient(0, top + h * 0.18, 0, top + h * 0.36);
  under.addColorStop(0, 'rgba(96,40,22,0.5)');
  under.addColorStop(1, 'rgba(96,40,22,0)');
  ctx.fillStyle = under;
  ctx.fill();
  // Rim band.
  ctx.fillStyle = clay;
  ctx.beginPath();
  ctx.roundRect(x - w * 0.52, top, w * 1.04, h * 0.2, h * 0.05);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,236,214,0.4)';
  ctx.fillRect(x - w * 0.5, top + h * 0.015, w, h * 0.035);
  // Dark soil at the mouth.
  ctx.fillStyle = '#4B3424';
  ctx.beginPath();
  ctx.ellipse(x, top + h * 0.02, w * 0.46, h * 0.045, 0, 0, TAU);
  ctx.fill();
}

/** A raceme of wisteria hanging from above. */
function wisteria(ctx: Ctx2D, x: number, y: number, length: number, rnd: () => number): void {
  const blooms = Math.round(length / 3.2);
  for (let i = 0; i < blooms; i++) {
    const t = i / blooms;
    const spread = length * 0.17 * (1 - t * 0.85);
    const px = x + (rnd() - 0.5) * 2 * spread + Math.sin(t * 3) * length * 0.03;
    const py = y + t * length + (rnd() - 0.5) * 3;
    const size = length * 0.055 * (1.15 - t * 0.6) * (0.8 + rnd() * 0.5);
    const tone = rnd();
    ctx.fillStyle = tone < 0.34 ? '#B79AE6' : tone < 0.7 ? '#9A78D4' : tone < 0.9 ? '#D9C6F6' : '#7C58BC';
    ctx.beginPath();
    ctx.ellipse(px, py, size, size * 1.25, rnd() * Math.PI, 0, TAU);
    ctx.fill();
  }
}

/** A wire basket lined with moss, hung on three chains, overflowing with fern. */
function basket(ctx: Ctx2D, x: number, y: number, size: number, rnd: () => number): void {
  ctx.strokeStyle = 'rgba(120,96,52,0.9)';
  ctx.lineWidth = Math.max(0.8, size * 0.03);
  ctx.beginPath();
  ctx.moveTo(x, -4);
  ctx.lineTo(x - size * 0.48, y);
  ctx.moveTo(x, -4);
  ctx.lineTo(x + size * 0.48, y);
  ctx.moveTo(x, -4);
  ctx.lineTo(x, y);
  ctx.stroke();
  // Fronds behind the bowl.
  crown(ctx, x, y, size * 1.55, Math.PI * 0.94, Math.PI * 2.06, 9, 0.95, DEEP, rnd);
  const moss = ctx.createLinearGradient(x - size * 0.5, 0, x + size * 0.5, 0);
  moss.addColorStop(0, '#5C4526');
  moss.addColorStop(0.7, '#9A7A46');
  moss.addColorStop(1, '#B6945A');
  ctx.fillStyle = moss;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.5, y);
  ctx.bezierCurveTo(x - size * 0.46, y + size * 0.52, x + size * 0.46, y + size * 0.52, x + size * 0.5, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,44,22,0.45)';
  ctx.lineWidth = Math.max(0.6, size * 0.018);
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    ctx.moveTo(x + i * size * 0.14, y);
    ctx.quadraticCurveTo(x + i * size * 0.13, y + size * 0.3, x + i * size * 0.05, y + size * 0.39);
  }
  ctx.stroke();
  // Fronds spilling over the front.
  crown(ctx, x, y + size * 0.02, size * 1.2, Math.PI * 1.02, Math.PI * 1.98, 8, 1.15, NEAR, rnd);
}

// --- Architecture ------------------------------------------------------------------

/** White-painted iron: a soft shadow line first, then the member. */
function iron(ctx: Ctx2D, width: number, trace: () => void): void {
  ctx.lineCap = 'butt';
  ctx.save();
  ctx.translate(-width * 0.35, width * 0.4);
  trace();
  ctx.strokeStyle = 'rgba(128,156,150,0.5)';
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
  trace();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = width;
  ctx.stroke();
}

/** One bay of the glass wall: an arched fanlight over tall panes. */
function bay(ctx: Ctx2D, cx: number, half: number, spring: number, rise: number, foot: number, u: number, major: boolean): void {
  const post = (major ? 5 : 3.2) * u;
  const bar = (major ? 1.6 : 1.1) * u;
  // Glazing bars of the tall panes.
  const panes = major ? 6 : 4;
  for (let i = 1; i < panes; i++) {
    const x = cx - half + ((half * 2) / panes) * i;
    iron(ctx, i === panes / 2 ? bar * 1.6 : bar, () => {
      ctx.beginPath();
      ctx.moveTo(x, spring);
      ctx.lineTo(x, foot);
    });
  }
  const tall = foot - spring;
  const transoms = Math.max(2, Math.round(tall / (half * 0.62)));
  for (let i = 1; i <= transoms; i++) {
    const y = spring + (tall / (transoms + 0.4)) * i;
    iron(ctx, bar, () => {
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
    });
  }
  // Fanlight: radial bars between a hub and two rings.
  const rays = major ? 12 : 8;
  for (let i = 1; i < rays; i++) {
    const a = Math.PI + (Math.PI / rays) * i;
    iron(ctx, bar, () => {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * half * 0.24, spring + Math.sin(a) * rise * 0.24);
      ctx.lineTo(cx + Math.cos(a) * half, spring + Math.sin(a) * rise);
    });
  }
  for (const k of major ? [0.24, 0.63] : [0.3]) {
    iron(ctx, bar * 1.5, () => {
      ctx.beginPath();
      ctx.ellipse(cx, spring, half * k, rise * k, 0, Math.PI, TAU);
    });
  }
  if (major) {
    // A ring of small roundels between the two rings.
    for (let i = 0; i < rays; i++) {
      const a = Math.PI + (Math.PI / rays) * (i + 0.5);
      const rx = cx + Math.cos(a) * half * 0.815;
      const ry = spring + Math.sin(a) * rise * 0.815;
      iron(ctx, bar * 0.9, () => {
        ctx.beginPath();
        ctx.arc(rx, ry, Math.min(half, rise) * 0.062, 0, TAU);
      });
    }
  }
  // The arch rib, the springing beam and the posts.
  iron(ctx, post, () => {
    ctx.beginPath();
    ctx.ellipse(cx, spring, half, rise, 0, Math.PI, TAU);
  });
  iron(ctx, post * 0.8, () => {
    ctx.beginPath();
    ctx.moveTo(cx - half, spring);
    ctx.lineTo(cx + half, spring);
  });
  for (const side of [-1, 1]) {
    const x = cx + side * half;
    iron(ctx, post * 1.5, () => {
      ctx.beginPath();
      ctx.moveTo(x, spring);
      ctx.lineTo(x, foot);
    });
    // Capital.
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(x - post * 1.5, spring - post * 0.9, post * 3, post * 1.8, post * 0.4);
    ctx.fill();
    ctx.fillStyle = 'rgba(128,156,150,0.4)';
    ctx.fillRect(x - post * 1.5, spring + post * 0.55, post * 3, post * 0.35);
  }
}

// --- Scene -------------------------------------------------------------------------

export function paintScene(ctx: Ctx2D, W: number, H: number, env: PaintEnv): void {
  const rnd = seeded(0x61a55);
  const portrait = H >= W;
  const u = Math.min(2.4, Math.max(0.8, Math.min(W, H) / 400));
  const floorY = H * (portrait ? 0.8 : 0.76);
  const dado = H * 0.05;
  const wallFoot = floorY - dado;

  // 1. Sky beyond the glass: cool overhead, warm towards the garden.
  const sky = ctx.createLinearGradient(0, 0, 0, floorY);
  sky.addColorStop(0, '#BFDDEF');
  sky.addColorStop(0.45, '#DCEEF2');
  sky.addColorStop(0.85, '#F7F3E2');
  sky.addColorStop(1, '#FBF1DA');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Thin morning cloud.
  for (let i = 0; i < 7; i++) {
    const x = rnd() * W;
    const y = H * (0.04 + rnd() * 0.3);
    const rx = W * (0.18 + rnd() * 0.28);
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, rx);
    cloud.addColorStop(0, 'rgba(255,255,255,0.55)');
    cloud.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(0, y);
    ctx.scale(1, 0.3);
    ctx.translate(0, -y);
    ctx.fillStyle = cloud;
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }

  // 2. The garden outside: trees dissolved in the morning haze.
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer === 0 ? 'rgba(196,222,208,0.75)' : 'rgba(170,208,186,0.7)';
    ctx.beginPath();
    const baseY = wallFoot;
    const lift = H * (layer === 0 ? 0.2 : 0.12);
    ctx.moveTo(-10, baseY);
    let x = -10;
    while (x < W + 40) {
      const w = (40 + rnd() * 70) * u;
      const h = lift * (0.55 + rnd() * 0.6);
      ctx.bezierCurveTo(x + w * 0.1, baseY - h * 1.25, x + w * 0.9, baseY - h * 1.25, x + w, baseY - h * 0.3);
      x += w;
    }
    ctx.lineTo(W + 40, baseY);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Far palms inside, pale with distance.
  if (!portrait) {
    palm(ctx, W * 0.3, floorY, W * 0.285, H * 0.4, H * 0.2, FAR, rnd);
    palm(ctx, W * 0.72, floorY, W * 0.735, H * 0.36, H * 0.22, FAR, rnd);
  } else {
    palm(ctx, W * 0.27, floorY, W * 0.24, H * 0.5, W * 0.3, FAR, rnd);
    palm(ctx, W * 0.76, floorY, W * 0.8, H * 0.46, W * 0.33, FAR, rnd);
  }

  // 4. The glass wall: light caught in the panes, then the white iron.
  const half = portrait ? W * 0.475 : Math.min(W * 0.23, H * 0.52);
  const spring = portrait ? H * 0.265 : H * 0.43;
  const rise = Math.min(half * 0.92, spring - H * 0.035);
  const cx = W / 2;
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W;
    const y = rnd() * wallFoot * 0.9;
    const w = (30 + rnd() * 60) * u;
    const streak = ctx.createLinearGradient(x, y, x + w, y + w * 1.6);
    streak.addColorStop(0, 'rgba(255,255,255,0)');
    streak.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    streak.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.5, y + w * 1.6);
    ctx.lineTo(x, y + w * 1.6);
    ctx.closePath();
    ctx.fill();
  }
  // Roof glazing above the arches: fine bars running to the ridge.
  const roofBars = Math.round(W / (22 * u));
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(0.8, 0.9 * u);
  ctx.beginPath();
  for (let i = 0; i <= roofBars; i++) {
    const x = (W / roofBars) * i;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (x - cx) * 0.06, spring);
  }
  ctx.stroke();
  // Hide the roof bars inside the fanlights by repainting those as clear glass.
  const bays: { x: number; half: number; major: boolean }[] = [{ x: cx, half, major: true }];
  if (!portrait) {
    const side = half * 0.56;
    let offset = half + side + 9 * u;
    while (cx - offset + side > -side) {
      bays.push({ x: cx - offset, half: side, major: false }, { x: cx + offset, half: side, major: false });
      offset += side * 2 + 9 * u;
    }
  }
  for (const b of bays) {
    const bayRise = b.major ? rise : Math.min(b.half * 0.95, rise * 0.6);
    const glass = ctx.createLinearGradient(0, spring - bayRise, 0, spring);
    glass.addColorStop(0, '#C9E3F1');
    glass.addColorStop(1, '#E2F0F1');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(b.x, spring, b.half, bayRise, 0, Math.PI, TAU);
    ctx.fill();
    bay(ctx, b.x, b.half, spring, bayRise, wallFoot, u, b.major);
  }
  // Ridge beam along the top.
  iron(ctx, 4 * u, () => {
    ctx.beginPath();
    ctx.moveTo(0, 2 * u);
    ctx.lineTo(W, 2 * u);
  });

  // 5. Haze inside the house, thickest low down, and the glare of the sun itself.
  const haze = ctx.createLinearGradient(0, H * 0.1, 0, floorY);
  haze.addColorStop(0, 'rgba(255,252,240,0)');
  haze.addColorStop(1, 'rgba(255,252,240,0.5)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, floorY);
  const sunR = Math.max(W, H) * 0.62;
  const sun = ctx.createRadialGradient(W * 0.96, -H * 0.02, 0, W * 0.96, -H * 0.02, sunR);
  sun.addColorStop(0, 'rgba(255,253,236,0.95)');
  sun.addColorStop(0.25, 'rgba(255,248,214,0.5)');
  sun.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // 6. Dado: the low white wall the glass stands on.
  const wall = ctx.createLinearGradient(0, wallFoot, 0, floorY);
  wall.addColorStop(0, '#FFFFFF');
  wall.addColorStop(0.18, '#F4F1E6');
  wall.addColorStop(1, '#DCD8C8');
  ctx.fillStyle = wall;
  ctx.fillRect(0, wallFoot, W, dado);
  ctx.fillStyle = 'rgba(120,128,110,0.28)';
  ctx.fillRect(0, floorY - 1.5 * u, W, 1.5 * u);

  // 7. Floor: encaustic tiles in perspective, paler with distance.
  const floor = ctx.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, '#F1E7D2');
  floor.addColorStop(1, '#E9D9BC');
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, W, H - floorY);
  const vanishY = floorY - (H - floorY) * 0.9;
  const rowsOfTiles = 7;
  const tileAtFoot = Math.max(46 * u, W / 9);
  const colsOfTiles = Math.ceil(W / tileAtFoot / 2) + 3;
  const rowY = (k: number): number => floorY + (H - floorY) * Math.pow(k / rowsOfTiles, 1.7);
  const colX = (c: number, y: number): number => cx + c * tileAtFoot * ((y - vanishY) / (H - vanishY));
  for (let k = 0; k < rowsOfTiles; k++) {
    const y0 = rowY(k);
    const y1 = rowY(k + 1);
    const fade = 0.25 + 0.75 * (k / (rowsOfTiles - 1));
    for (let c = -colsOfTiles; c < colsOfTiles; c++) {
      if ((c + k) % 2 === 0) continue;
      ctx.fillStyle = `rgba(206,146,112,${0.5 * fade})`;
      ctx.beginPath();
      ctx.moveTo(colX(c, y0), y0);
      ctx.lineTo(colX(c + 1, y0), y0);
      ctx.lineTo(colX(c + 1, y1), y1);
      ctx.lineTo(colX(c, y1), y1);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Sunlight on the floor: bright bars between the shadows of the glazing.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, floorY, W, H - floorY);
  ctx.clip();
  for (let i = -1; i < 7; i++) {
    const x = W * (0.02 + i * 0.26);
    const w = W * 0.17;
    const lean = (H - floorY) * 1.15;
    const light = ctx.createLinearGradient(0, floorY, 0, H);
    light.addColorStop(0, 'rgba(255,250,224,0.2)');
    light.addColorStop(1, 'rgba(255,250,224,0.62)');
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x + lean, floorY);
    ctx.lineTo(x + lean + w * 0.7, floorY);
    ctx.lineTo(x + w, H);
    ctx.lineTo(x, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 8. Middle distance: shrubs and broad leaves along the wall, softened by haze.
  const shrubs = portrait ? 5 : 9;
  for (let i = 0; i < shrubs; i++) {
    const f = (i + 0.5) / shrubs;
    // Leave the middle open: the board stands there.
    if (Math.abs(f - 0.5) < (portrait ? 0.12 : 0.2)) continue;
    const x = W * f + (rnd() - 0.5) * 30 * u;
    const size = (70 + rnd() * 50) * u;
    if (i % 2 === 0) {
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.42 + (rnd() - 0.5) * 0.2;
        paddle(ctx, x, floorY + 2, a, size * (0.8 + rnd() * 0.4), size * 0.17, (k - 2) * 0.35, MID);
      }
    } else {
      crown(ctx, x, floorY - size * 0.1, size * 0.85, Math.PI * 1.05, Math.PI * 1.95, 8, 0.6, MID, rnd);
    }
  }
  const veil = ctx.createLinearGradient(0, floorY - H * 0.2, 0, floorY);
  veil.addColorStop(0, 'rgba(255,252,240,0)');
  veil.addColorStop(1, 'rgba(255,252,240,0.3)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, floorY - H * 0.2, W, H * 0.2);

  // 9. Sunbeams slanting in from the upper right.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const beams = portrait ? 4 : 6;
  for (let i = 0; i < beams; i++) {
    const x0 = W * (0.34 + (i / beams) * 0.86);
    const w = W * (portrait ? 0.1 : 0.05) * (0.7 + rnd() * 0.8);
    const fall = H * 1.05;
    const lean = fall * 0.62;
    const beam = ctx.createLinearGradient(x0, 0, x0 - lean, fall);
    beam.addColorStop(0, 'rgba(255,246,206,0.42)');
    beam.addColorStop(0.6, 'rgba(255,246,206,0.16)');
    beam.addColorStop(1, 'rgba(255,246,206,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x0, -4);
    ctx.lineTo(x0 + w, -4);
    ctx.lineTo(x0 + w * 1.7 - lean, fall);
    ctx.lineTo(x0 - lean, fall);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 10. Quiet the middle: the board, the name and the texts sit here.
  const calm = ctx.createRadialGradient(cx, H * 0.46, 0, cx, H * 0.46, Math.max(W * 0.62, H * 0.42));
  calm.addColorStop(0, 'rgba(255,252,242,0.5)');
  calm.addColorStop(0.6, 'rgba(255,252,242,0.3)');
  calm.addColorStop(1, 'rgba(255,252,242,0)');
  ctx.fillStyle = calm;
  ctx.fillRect(0, 0, W, H);

  // 11. Foreground, strong and saturated: wisteria and baskets above, pots below.
  const edge = portrait ? W * 0.085 : W * 0.06;
  const basketSize = (portrait ? 44 : 58) * u;
  for (let i = 0; i < (portrait ? 3 : 5); i++) {
    wisteria(ctx, edge * (0.2 + i * 0.62) + rnd() * 6, -6, (64 + rnd() * 46) * u, rnd);
    wisteria(ctx, W - edge * (0.2 + i * 0.62) - rnd() * 6, -6, (56 + rnd() * 40) * u, rnd);
  }
  basket(ctx, edge * 1.05, H * (portrait ? 0.062 : 0.1), basketSize, rnd);
  basket(ctx, W - edge * 0.95, H * (portrait ? 0.05 : 0.085), basketSize * 0.92, rnd);
  if (!portrait) {
    basket(ctx, W * 0.21, H * 0.06, basketSize * 0.7, rnd);
    basket(ctx, W * 0.8, H * 0.055, basketSize * 0.74, rnd);
  }

  const potW = (portrait ? 62 : 84) * u;
  const footY = H + potW * 0.2;
  // Left: a tall fern. Right: a canna with paddle leaves and a smaller fern in front.
  const leftX = portrait ? W * 0.04 : W * 0.07;
  const rightX = portrait ? W * 0.97 : W * 0.93;
  crown(ctx, leftX, footY - potW * 0.86, potW * 1.9, Math.PI * 1.1, Math.PI * 1.96, 10, 0.5, DEEP, rnd);
  crown(ctx, leftX, footY - potW * 0.84, potW * 1.45, Math.PI * 1.18, Math.PI * 1.92, 7, 0.38, NEAR, rnd);
  pot(ctx, leftX, footY, potW);
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 - 0.15 + (k - 2.5) * 0.3 + (rnd() - 0.5) * 0.12;
    paddle(ctx, rightX, footY - potW * 0.8, a, potW * (1.5 + rnd() * 0.7), potW * 0.26, (k - 2.5) * 0.3, k % 2 === 0 ? DEEP : NEAR);
  }
  pot(ctx, rightX, footY, potW * 1.08);
  if (!portrait) {
    const x2 = W * 0.165;
    crown(ctx, x2, H - potW * 0.5, potW * 1.2, Math.PI * 1.08, Math.PI * 1.92, 8, 0.6, NEAR, rnd);
    pot(ctx, x2, H + potW * 0.12, potW * 0.72);
    const x3 = W * 0.845;
    crown(ctx, x3, H - potW * 0.46, potW * 1.1, Math.PI * 1.08, Math.PI * 1.92, 8, 0.6, NEAR, rnd);
    pot(ctx, x3, H + potW * 0.14, potW * 0.7);
  }
  // Geraniums in the left pot: a few coral heads for a clear accent.
  for (let i = 0; i < 5; i++) {
    const gx = leftX + (rnd() - 0.2) * potW * 0.9;
    const gy = footY - potW * (0.95 + rnd() * 0.5);
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = k % 3 === 0 ? '#FF9C84' : k % 3 === 1 ? '#EC5F4C' : '#D4463A';
      ctx.beginPath();
      ctx.arc(gx + (rnd() - 0.5) * potW * 0.16, gy + (rnd() - 0.5) * potW * 0.13, potW * 0.045, 0, TAU);
      ctx.fill();
    }
  }

  if (env.highContrast) {
    // High contrast: the world steps far back behind the interface.
    ctx.fillStyle = 'rgba(255,253,245,0.82)';
    ctx.fillRect(0, 0, W, H);
  }
}

// --- Ambient: dust in the beams, one butterfly ------------------------------------

const MOTES = 34;
const moteX = new Float32Array(MOTES);
const moteY = new Float32Array(MOTES);
const moteSize = new Float32Array(MOTES);
const moteSpeed = new Float32Array(MOTES);
const motePhase = new Float32Array(MOTES);
{
  const rnd = seeded(0xd057);
  for (let i = 0; i < MOTES; i++) {
    moteX[i] = rnd();
    moteY[i] = rnd();
    moteSize[i] = 0.7 + rnd() * 1.5;
    moteSpeed[i] = 0.004 + rnd() * 0.009;
    motePhase[i] = rnd() * TAU;
  }
}

export function paintAmbient(ctx: Ctx2D, W: number, H: number, time: number): void {
  const seconds = time * 0.001;
  // Motes drift down the slope of the beams and glow as they turn to the light.
  // Three brightness bands, one path each: no per-mote state changes.
  for (let band = 0; band < 3; band++) {
    ctx.fillStyle = band === 0 ? 'rgba(255,250,226,0.9)' : band === 1 ? 'rgba(255,246,206,0.6)' : 'rgba(255,255,255,0.34)';
    ctx.beginPath();
    for (let i = 0; i < MOTES; i++) {
      const twinkle = Math.sin(seconds * 0.9 + (motePhase[i] ?? 0));
      const level = twinkle > 0.45 ? 0 : twinkle > -0.3 ? 1 : 2;
      if (level !== band) continue;
      const travel = seconds * (moteSpeed[i] ?? 0);
      const fy = ((moteY[i] ?? 0) + travel) % 1;
      const fx = ((((moteX[i] ?? 0) - travel * 0.55 + Math.sin(seconds * 0.23 + i) * 0.012) % 1) + 1) % 1;
      const x = fx * W;
      const y = fy * H;
      const size = moteSize[i] ?? 1;
      ctx.moveTo(x + size, y);
      ctx.arc(x, y, size, 0, TAU);
    }
    ctx.fill();
  }

  // A cabbage white wanders across the upper part of the house.
  const loop = seconds * 0.055;
  const bx = W * (0.5 + 0.46 * Math.sin(loop * TAU)) + Math.sin(seconds * 1.7) * 6;
  const by = H * (0.2 + 0.1 * Math.sin(loop * TAU * 2 + 1)) + Math.sin(seconds * 2.3) * 5;
  const heading = Math.cos(loop * TAU) >= 0 ? 1 : -1;
  const flap = Math.abs(Math.sin(seconds * 9));
  const wing = Math.max(5, Math.min(W, H) * 0.016);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx - heading * wing * 0.2, by - wing * (0.5 + flap), bx - heading * wing * (0.9 * flap + 0.25), by - wing * (0.6 + 0.5 * flap));
  ctx.quadraticCurveTo(bx - heading * wing * (0.7 * flap + 0.3), by - wing * 0.1, bx, by);
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx + heading * wing * 0.5, by - wing * (0.3 + flap * 0.8), bx + heading * wing * (0.5 + 0.5 * flap), by - wing * (0.3 + 0.7 * flap));
  ctx.quadraticCurveTo(bx + heading * wing * 0.7, by + wing * 0.05, bx, by);
  ctx.fill();
  ctx.fillStyle = 'rgba(70,84,74,0.8)';
  ctx.fillRect(bx - 0.6, by - wing * 0.18, 1.2, wing * 0.36);
}
