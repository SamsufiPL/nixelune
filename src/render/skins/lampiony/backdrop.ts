/**
 * The world of `lampiony`: a lake at dusk on the night of a lantern festival. Layers
 * from the back: afterglow sky with long clouds, a big low moon, three ridges fading
 * into the haze, the far shore with its lights, the water with the moon's path, paper
 * lanterns drifting from the far shore to the viewer, a pier with a string of lights,
 * and reeds and branches in the foreground. The middle of the screen, where the
 * board sits, carries the horizon in portrait and stays low in contrast; the top is
 * dark sky for the HUD and the bottom is dark water for the buttons.
 *
 * `paintScene` runs once per size. `paintAmbient` runs at AMBIENT_FPS with flat fills
 * only and allocates nothing: fireflies, the flicker of the lanterns, glitter on the
 * moon's path and two sky lanterns that rise very slowly.
 */
import type { Ctx2D, PaintEnv } from '../../skin';
import { DUSK } from './palette';

const TAU = Math.PI * 2;
export const AMBIENT_FPS = 20;

/** Deterministic scatter in [0, 1): the same lantern is in the same place every time. */
export function hash(i: number, k: number): number {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// Layout of the scene for the last size asked for. Module scalars: no allocation.
let horizon = 0;
let moonX = 0;
let moonY = 0;
let moonR = 0;
let unit = 1;

function layout(width: number, height: number): void {
  const portrait = height >= width * 1.15;
  horizon = Math.round(height * (portrait ? 0.36 : 0.6));
  unit = Math.min(2.2, Math.max(0.85, Math.min(width, height) / 360));
  moonR = Math.min(width, height) * (portrait ? 0.17 : 0.13);
  moonX = width * (portrait ? 0.69 : 0.8);
  moonY = horizon - moonR * 0.92;
}

/** Height of the horizon for a screen size, for pictures that sit on the water. */
export function sceneHorizon(width: number, height: number): number {
  layout(width, height);
  return horizon;
}

// --- Drifting paper lanterns: shared by the scene and the ambient flicker ------------
const LANTERNS = 30;
let lanternX = 0;
let lanternY = 0;
let lanternS = 0;

/** Place lantern `i`: far ones are small and near the horizon, near ones keep to the sides. */
function placeLantern(i: number, width: number, height: number): void {
  const t = Math.pow((i + 0.5) / LANTERNS, 1.15);
  const depth = t * t;
  lanternY = horizon + (height - horizon) * (0.035 + 0.93 * depth);
  lanternS = unit * (1.3 + 11 * depth);
  let x = hash(i, 1);
  if (depth > 0.45) {
    // Near the viewer: leave the middle, where the buttons are, calm.
    const side = hash(i, 2) > 0.5 ? 1 : -1;
    x = 0.5 + side * (0.3 + 0.19 * hash(i, 3));
  }
  lanternX = width * (0.04 + 0.92 * x);
}

const PAPER: readonly (readonly [string, string, string, string])[] = [
  ['#FFF6D2', '#FFCB66', '#EE8A2C', '255,176,84'],
  ['#FFF6D2', '#FFCB66', '#EE8A2C', '255,176,84'],
  ['#FFF1DC', '#FFB08A', '#DC5332', '255,132,92'],
  ['#FFF6D2', '#FFD98A', '#F0A23C', '255,196,110'],
  ['#F2FFE9', '#9FE8C0', '#3BA588', '120,226,180'],
  ['#FFF6D2', '#FFCB66', '#EE8A2C', '255,176,84'],
  ['#F7EEFF', '#CBB0FF', '#7E57C8', '186,150,255'],
];

function glow(ctx: Ctx2D, x: number, y: number, radius: number, rgb: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.4, `rgba(${rgb},${alpha * 0.38})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** A paper lantern on the water, seen from the side, with its light and broken reflection. */
function paperLantern(ctx: Ctx2D, x: number, y: number, s: number, kind: number, seed: number): void {
  const paper = PAPER[kind % PAPER.length] ?? PAPER[0]!;
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y - s * 0.5, s * 4.2, paper[3], 0.34);
  // Reflection: short strokes that widen, wander and fade with distance from the lantern.
  const dashes = s < 3 ? 3 : 7;
  for (let k = 0; k < dashes; k++) {
    const f = k / dashes;
    const dy = s * (0.22 + k * 0.5);
    const half = s * (0.5 + f * 0.5) * (0.7 + 0.5 * hash(seed, 10 + k));
    const dx = (hash(seed, 20 + k) - 0.5) * s * 0.7 * f;
    ctx.fillStyle = `rgba(${paper[3]},${(0.6 * (1 - f) * (1 - f)).toFixed(3)})`;
    ctx.fillRect(x + dx - half, y + dy, half * 2, Math.max(0.8, s * 0.17));
  }
  ctx.globalCompositeOperation = 'source-over';
  if (s < 2.4) {
    ctx.fillStyle = paper[1];
    ctx.fillRect(x - s * 0.5, y - s, s, s);
    return;
  }
  // The float it stands on.
  ctx.fillStyle = '#1A0C12';
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.82, s * 0.16, 0, 0, TAU);
  ctx.fill();
  const body = ctx.createRadialGradient(x, y - s * 0.5, s * 0.05, x, y - s * 0.55, s * 0.85);
  body.addColorStop(0, paper[0]);
  body.addColorStop(0.5, paper[1]);
  body.addColorStop(1, paper[2]);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.56, y - s * 1.1, s * 1.12, s * 1.04, s * 0.24);
  ctx.fill();
  if (s > 6) {
    // Ribs of the frame and a dark rim above and below.
    ctx.strokeStyle = 'rgba(120,50,20,0.35)';
    ctx.lineWidth = Math.max(0.6, s * 0.035);
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      ctx.moveTo(x + k * s * 0.28, y - s * 1.06);
      ctx.lineTo(x + k * s * 0.28, y - s * 0.1);
    }
    ctx.stroke();
    ctx.fillStyle = '#2A1216';
    ctx.fillRect(x - s * 0.5, y - s * 1.16, s, s * 0.1);
    ctx.fillRect(x - s * 0.5, y - s * 0.14, s, s * 0.1);
  }
}

/** Ridge line: a sum of three waves, measured in px of `unit` so shapes keep their scale. */
function ridge(x: number, seed: number): number {
  const u = x / unit;
  return (
    0.5 +
    0.26 * Math.sin(u * 0.0095 + seed * 1.7) +
    0.15 * Math.sin(u * 0.023 + seed * 3.1) +
    0.09 * Math.sin(u * 0.051 + seed * 5.3)
  );
}

function paintRidge(ctx: Ctx2D, width: number, base: number, amp: number, seed: number, fill: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.moveTo(0, horizon + 1);
  for (let x = 0; x <= width + 3; x += 3) ctx.lineTo(x, base - amp * ridge(x, seed));
  ctx.lineTo(width, horizon + 1);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function conifer(ctx: Ctx2D, x: number, y: number, hgt: number): void {
  const w = hgt * 0.3;
  ctx.moveTo(x, y - hgt);
  ctx.lineTo(x + w * 0.45, y - hgt * 0.62);
  ctx.lineTo(x + w * 0.25, y - hgt * 0.62);
  ctx.lineTo(x + w * 0.75, y - hgt * 0.3);
  ctx.lineTo(x + w * 0.4, y - hgt * 0.3);
  ctx.lineTo(x + w, y + 1);
  ctx.lineTo(x - w, y + 1);
  ctx.lineTo(x - w * 0.4, y - hgt * 0.3);
  ctx.lineTo(x - w * 0.75, y - hgt * 0.3);
  ctx.lineTo(x - w * 0.25, y - hgt * 0.62);
  ctx.lineTo(x - w * 0.45, y - hgt * 0.62);
  ctx.closePath();
}

function roundTree(ctx: Ctx2D, x: number, y: number, hgt: number, seed: number): void {
  for (let k = 0; k < 5; k++) {
    const a = hash(seed, 30 + k) * TAU;
    const d = hgt * 0.22 * hash(seed, 40 + k);
    const rad = hgt * (0.26 + 0.12 * hash(seed, 50 + k));
    ctx.moveTo(x + Math.cos(a) * d + rad, y - hgt * 0.62 + Math.sin(a) * d);
    ctx.arc(x + Math.cos(a) * d, y - hgt * 0.62 + Math.sin(a) * d, rad, 0, TAU);
  }
  ctx.rect(x - hgt * 0.035, y - hgt * 0.5, hgt * 0.07, hgt * 0.52);
}

function paintSky(ctx: Ctx2D, width: number, height: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, DUSK.zenith);
  sky.addColorStop(0.4, '#2E1742');
  sky.addColorStop(0.68, '#5E2550');
  sky.addColorStop(0.86, '#A8433F');
  sky.addColorStop(0.96, DUSK.ember);
  sky.addColorStop(1, '#F0A257');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon + 1);
  // The afterglow gathers where the sun went down, under the moon.
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, moonX - width * 0.12, horizon, Math.max(width, height) * 0.55, '255,150,80', 0.3);
  ctx.globalCompositeOperation = 'source-over';

  // Long clouds, lit from below: plum on top, a rose and ember underside.
  const clouds = 9;
  for (let i = 0; i < clouds; i++) {
    const f = (i + 0.5) / clouds;
    const y = horizon * (0.16 + 0.74 * f) + (hash(i, 61) - 0.5) * horizon * 0.06;
    const x = width * hash(i, 62);
    const len = width * (0.26 + 0.4 * hash(i, 63)) * (0.7 + f * 0.6);
    const thick = unit * (3.5 + 6 * hash(i, 64)) * (1.3 - f * 0.5);
    for (let pass = 0; pass < 2; pass++) {
      ctx.save();
      ctx.translate(x + (pass === 0 ? 0 : len * 0.16), y + (pass === 0 ? 0 : thick * 0.7));
      ctx.scale(len * (pass === 0 ? 1 : 0.72), thick);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const warm = pass === 1;
      const alpha = (warm ? 0.2 + 0.28 * f : 0.34 - 0.1 * f).toFixed(3);
      g.addColorStop(0, warm ? `rgba(255,${Math.round(126 + 60 * f)},${Math.round(104 - 10 * f)},${alpha})` : `rgba(58,30,74,${alpha})`);
      g.addColorStop(1, warm ? 'rgba(255,140,100,0)' : 'rgba(58,30,74,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
  }
}

function paintMoon(ctx: Ctx2D): void {
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, moonX, moonY, moonR * 4.2, '255,206,140', 0.42);
  ctx.globalCompositeOperation = 'source-over';
  const disc = ctx.createRadialGradient(moonX - moonR * 0.3, moonY - moonR * 0.35, moonR * 0.1, moonX, moonY, moonR);
  disc.addColorStop(0, '#FFFBEC');
  disc.addColorStop(0.7, DUSK.moon);
  disc.addColorStop(1, '#FFDFA0');
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, TAU);
  ctx.fillStyle = disc;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Seas of the moon, barely there.
  const seas: readonly (readonly [number, number, number])[] = [
    [-0.3, -0.25, 0.3],
    [0.18, -0.38, 0.2],
    [0.3, 0.1, 0.26],
    [-0.12, 0.3, 0.22],
    [-0.5, 0.15, 0.14],
  ];
  for (const [dx, dy, rad] of seas) glow(ctx, moonX + dx * moonR, moonY + dy * moonR, rad * moonR * 1.3, '196,132,96', 0.2);
  // Near the horizon the air reddens it.
  const haze = ctx.createLinearGradient(0, moonY - moonR * 0.2, 0, moonY + moonR);
  haze.addColorStop(0, 'rgba(255,150,90,0)');
  haze.addColorStop(1, 'rgba(255,138,84,0.6)');
  ctx.fillStyle = haze;
  ctx.fillRect(moonX - moonR, moonY - moonR, moonR * 2, moonR * 2);
  ctx.restore();
}

function paintLand(ctx: Ctx2D, width: number): void {
  const u = unit;
  // Three ridges: the farther, the paler and warmer (the haze of the afterglow).
  const far = ctx.createLinearGradient(0, horizon - 70 * u, 0, horizon);
  far.addColorStop(0, '#77375A');
  far.addColorStop(1, '#B04F4C');
  paintRidge(ctx, width, horizon - 14 * u, 52 * u, 1.3, far);
  const mid = ctx.createLinearGradient(0, horizon - 46 * u, 0, horizon);
  mid.addColorStop(0, '#45224C');
  mid.addColorStop(1, '#6E2F50');
  paintRidge(ctx, width, horizon - 6 * u, 36 * u, 4.1, mid);

  // The far shore: a low dark band with woods on it.
  ctx.beginPath();
  ctx.moveTo(0, horizon + 1);
  for (let x = 0; x <= width + 3; x += 3) ctx.lineTo(x, horizon - 2 * u - 12 * u * ridge(x, 7.7) * (0.35 + 0.65 * Math.abs(Math.cos((x / width) * Math.PI))));
  ctx.lineTo(width, horizon + 1);
  ctx.closePath();
  const n = Math.round(width / (9 * u));
  for (let i = 0; i < n; i++) {
    const x = (i + hash(i, 71)) * (width / n);
    const edge = Math.abs(Math.cos((x / width) * Math.PI));
    const hgt = u * (5 + 15 * hash(i, 72)) * (0.4 + 0.9 * edge);
    const y = horizon - 2 * u - 12 * u * ridge(x, 7.7) * (0.35 + 0.65 * edge) + 2;
    if (hash(i, 73) > 0.45) conifer(ctx, x, y, hgt * 1.25);
    else roundTree(ctx, x, y, hgt, i);
  }
  ctx.fillStyle = '#231531';
  ctx.fill();

  // Lights of the festival along the far shore.
  ctx.globalCompositeOperation = 'lighter';
  const lights = Math.round(width / (13 * u));
  for (let i = 0; i < lights; i++) {
    if (hash(i, 81) < 0.3) continue;
    const x = (i + hash(i, 82)) * (width / lights);
    const y = horizon - u * (1 + 3 * hash(i, 83));
    glow(ctx, x, y, u * (3 + 3 * hash(i, 84)), hash(i, 85) > 0.25 ? '255,190,110' : '255,140,100', 0.75);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function paintWater(ctx: Ctx2D, width: number, height: number): void {
  const depth = height - horizon;
  const water = ctx.createLinearGradient(0, horizon, 0, height);
  water.addColorStop(0, '#D98A55');
  water.addColorStop(0.035, '#A14A4A');
  water.addColorStop(0.13, '#5A2850');
  water.addColorStop(0.3, '#2A2147');
  water.addColorStop(0.55, '#10283A');
  water.addColorStop(1, DUSK.tealNight);
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, width, depth);
  // The woods of the far shore, mirrored and soft.
  const mirror = ctx.createLinearGradient(0, horizon, 0, horizon + 30 * unit);
  mirror.addColorStop(0, 'rgba(30,16,42,0.85)');
  mirror.addColorStop(1, 'rgba(30,16,42,0)');
  ctx.fillStyle = mirror;
  ctx.fillRect(0, horizon, width, 30 * unit);

  // The moon's path: strokes of light that widen and thin out towards the viewer.
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, moonX, horizon + depth * 0.1, moonR * 2.6, '255,180,110', 0.2);
  const rows = 70;
  for (let i = 0; i < rows; i++) {
    const f = i / rows;
    const y = horizon + depth * (0.012 + 0.8 * f * f);
    const spread = moonR * (0.5 + 2.4 * f);
    const dashes = 1 + Math.floor(3 * hash(i, 91));
    for (let k = 0; k < dashes; k++) {
      const x = moonX + (hash(i, 92 + k) - 0.5) * spread * 1.6;
      const half = unit * (2 + 16 * hash(i, 95 + k)) * (0.5 + f);
      const alpha = 0.55 * (1 - f) * (1 - f) * (0.4 + 0.6 * hash(i, 98 + k));
      ctx.fillStyle = `rgba(255,${Math.round(214 - 30 * f)},${Math.round(150 - 20 * f)},${alpha.toFixed(3)})`;
      ctx.fillRect(x - half, y, half * 2, Math.max(0.8, unit * (0.7 + 1.2 * f)));
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // Ripples: fine near the horizon, long and sparse in front.
  const ripples = 90;
  for (let i = 0; i < ripples; i++) {
    const f = hash(i, 101);
    const y = horizon + depth * (0.02 + 0.97 * f * f);
    const half = unit * (6 + 50 * hash(i, 102)) * (0.3 + f);
    const x = width * hash(i, 103);
    const pale = hash(i, 104) > 0.45;
    ctx.fillStyle = pale ? `rgba(150,190,210,${(0.035 + 0.05 * hash(i, 105)).toFixed(3)})` : 'rgba(2,6,12,0.16)';
    ctx.beginPath();
    ctx.ellipse(x, y, half, Math.max(0.5, unit * (0.4 + 0.9 * f)), 0, 0, TAU);
    ctx.fill();
  }
}

/** Sag of a string between two points, sampled at `t` in [0, 1]. */
function sag(t: number, depth: number): number {
  return depth * 4 * t * (1 - t);
}

function paintPier(ctx: Ctx2D, width: number, height: number): void {
  const u = unit;
  const y = horizon + (height - horizon) * 0.16;
  const end = width * 0.4;
  const wood = '#150B14';
  // Reflection first: a dark smear under the deck and wavering strokes under the posts.
  ctx.fillStyle = 'rgba(10,6,14,0.5)';
  ctx.fillRect(0, y + 3 * u, end - 4 * u, 5 * u);
  const posts = Math.max(3, Math.round(end / (38 * u)));
  for (let i = 0; i <= posts; i++) {
    const x = end - i * (end / posts) - 3 * u;
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = `rgba(10,6,14,${(0.5 * (1 - k / 6)).toFixed(3)})`;
      ctx.fillRect(x - 1.6 * u + (hash(i, 110 + k) - 0.5) * 3 * u, y + (8 + k * 4.6) * u, 3.2 * u, 2.4 * u);
    }
  }
  // Deck and posts.
  ctx.fillStyle = wood;
  ctx.fillRect(-2, y - 2.5 * u, end + 2, 4.5 * u);
  ctx.fillStyle = 'rgba(255,170,110,0.35)';
  ctx.fillRect(-2, y - 2.5 * u, end + 2, Math.max(0.6, 0.7 * u));
  ctx.fillStyle = wood;
  for (let i = 0; i <= posts; i++) {
    const x = end - i * (end / posts) - 3 * u;
    const tall = i % 2 === 0;
    ctx.fillRect(x - 1.5 * u, y - (tall ? 40 : 7) * u, 3 * u, (tall ? 40 : 7) * u + 9 * u);
  }
  // A string of lights from post to post, and a lantern on every tall post.
  ctx.strokeStyle = 'rgba(21,11,20,0.9)';
  ctx.lineWidth = Math.max(0.7, 0.8 * u);
  const span = (end / posts) * 2;
  for (let i = 0; i + 2 <= posts; i += 2) {
    const x0 = end - i * (end / posts) - 3 * u;
    ctx.beginPath();
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const x = x0 - span * t;
      const yy = y - 39 * u + sag(t, 9 * u);
      if (s === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 1; s < 6; s++) {
      const t = s / 6;
      const x = x0 - span * t;
      const yy = y - 39 * u + sag(t, 9 * u) + 1.4 * u;
      glow(ctx, x, yy, 5.5 * u, s % 2 === 0 ? '255,150,96' : '255,206,120', 0.85);
      ctx.fillStyle = '#FFF2CC';
      ctx.fillRect(x - 0.8 * u, yy - 0.8 * u, 1.6 * u, 1.6 * u);
      // Its glint in the water.
      ctx.fillStyle = 'rgba(255,190,110,0.2)';
      ctx.fillRect(x - 2 * u, y + (10 + 5 * hash(s + i * 7, 120)) * u, 4 * u, Math.max(0.8, u));
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  for (let i = 0; i <= posts; i += 2) {
    const x = end - i * (end / posts) - 3 * u;
    paperLantern(ctx, x, y - 41 * u, 6.5 * u, i === 0 ? 2 : 0, 200 + i);
  }
}

function paintReeds(ctx: Ctx2D, width: number, height: number): void {
  const u = unit;
  ctx.lineCap = 'round';
  for (let side = 0; side < 2; side++) {
    const blades = 15;
    for (let i = 0; i < blades; i++) {
      const f = i / blades;
      const baseX = side === 0 ? width * (-0.02 + 0.2 * f * f) : width * (1.02 - 0.17 * f * f);
      const hgt = u * (46 + 86 * hash(i + side * 40, 131)) * (1 - f * 0.55);
      const lean = (side === 0 ? 1 : -1) * u * (5 + 30 * hash(i + side * 40, 132));
      ctx.beginPath();
      ctx.moveTo(baseX, height + 4);
      ctx.quadraticCurveTo(baseX + lean * 0.2, height - hgt * 0.6, baseX + lean, height - hgt);
      ctx.strokeStyle = hash(i + side * 40, 133) > 0.5 ? '#070C12' : '#0C141C';
      ctx.lineWidth = u * (1.4 + 1.6 * hash(i + side * 40, 134));
      ctx.stroke();
      if (hash(i + side * 40, 135) > 0.62) {
        // A seed head.
        ctx.save();
        ctx.translate(baseX + lean, height - hgt);
        ctx.rotate(lean / hgt);
        ctx.beginPath();
        ctx.ellipse(0, -5 * u, 2.1 * u, 7 * u, 0, 0, TAU);
        ctx.fillStyle = '#0A0F16';
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

function paintBranches(ctx: Ctx2D, width: number): void {
  const u = unit;
  // Boughs of a willow reach in from both upper corners; a lantern hangs from each.
  for (let side = 0; side < 2; side++) {
    const dir = side === 0 ? 1 : -1;
    const x0 = side === 0 ? -6 * u : width + 6 * u;
    const reach = (side === 0 ? 0.3 : 0.24) * width;
    ctx.strokeStyle = '#0B0A14';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.moveTo(x0, -4 * u);
    ctx.quadraticCurveTo(x0 + dir * reach * 0.5, 4 * u, x0 + dir * reach, 22 * u);
    ctx.stroke();
    ctx.fillStyle = '#0B0A14';
    const twigs = 13;
    for (let i = 0; i < twigs; i++) {
      const t = (i + 0.6) / twigs;
      const bx = x0 + dir * reach * t;
      const by = 4 * u * t + 18 * u * t * t;
      const len = u * (20 + 34 * hash(i + side * 30, 141)) * (1 - t * 0.35);
      ctx.lineWidth = Math.max(0.6, 0.8 * u);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dir * 3 * u, by + len * 0.5, bx + dir * 1.5 * u, by + len);
      ctx.stroke();
      // Narrow leaves down the twig.
      ctx.beginPath();
      const leaves = Math.round(len / (5 * u));
      for (let k = 1; k <= leaves; k++) {
        const ly = by + (k / leaves) * len;
        const lx = bx + dir * 2.4 * u * Math.sin((k / leaves) * Math.PI * 0.8);
        const flip = k % 2 === 0 ? 1 : -1;
        ctx.ellipse(lx + flip * 2.2 * u, ly, 2.8 * u, 1 * u, flip * 0.9, 0, TAU);
        ctx.closePath();
      }
      ctx.fill();
    }
    // The hanging lantern.
    const hx = x0 + dir * reach * 0.62;
    const hy = 4 * u * 0.62 + 18 * u * 0.62 * 0.62;
    const drop = (side === 0 ? 34 : 24) * u;
    ctx.lineWidth = Math.max(0.6, 0.7 * u);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx, hy + drop);
    ctx.stroke();
    const s = (side === 0 ? 8 : 6.5) * u;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, hx, hy + drop + s * 0.5, s * 3.6, '255,176,84', 0.3);
    ctx.globalCompositeOperation = 'source-over';
    const body = ctx.createRadialGradient(hx, hy + drop + s * 0.55, s * 0.05, hx, hy + drop + s * 0.55, s * 0.85);
    body.addColorStop(0, '#FFF6D2');
    body.addColorStop(0.5, '#FFC860');
    body.addColorStop(1, side === 0 ? '#E67A2A' : '#D9502E');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(hx, hy + drop + s * 0.55, s * 0.62, s * 0.56, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1C0C12';
    ctx.fillRect(hx - s * 0.3, hy + drop - s * 0.06, s * 0.6, s * 0.12);
    ctx.fillRect(hx - s * 0.3, hy + drop + s * 1.06, s * 0.6, s * 0.12);
    ctx.fillRect(hx - s * 0.04, hy + drop + s * 1.18, s * 0.08, s * 0.5);
  }
}

export function paintScene(ctx: Ctx2D, width: number, height: number, env: PaintEnv): void {
  layout(width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  paintSky(ctx, width, height);
  paintMoon(ctx);
  paintLand(ctx, width);
  paintWater(ctx, width, height);
  // Far lanterns first, so nearer things cover them.
  for (let i = 0; i < LANTERNS; i++) {
    placeLantern(i, width, height);
    if (lanternS < unit * 4.2) paperLantern(ctx, lanternX, lanternY, lanternS, Math.floor(hash(i, 4) * PAPER.length), i);
  }
  paintPier(ctx, width, height);
  for (let i = 0; i < LANTERNS; i++) {
    placeLantern(i, width, height);
    if (lanternS >= unit * 4.2) paperLantern(ctx, lanternX, lanternY, lanternS, Math.floor(hash(i, 4) * PAPER.length), i);
  }
  paintReeds(ctx, width, height);
  paintBranches(ctx, width);

  // Dark towards the top and bottom edges: sky for the HUD, water for the buttons.
  const top = ctx.createLinearGradient(0, 0, 0, height * 0.2);
  top.addColorStop(0, 'rgba(14,8,24,0.55)');
  top.addColorStop(1, 'rgba(14,8,24,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, height * 0.2);
  const bottom = ctx.createLinearGradient(0, height * 0.72, 0, height);
  bottom.addColorStop(0, 'rgba(5,10,16,0)');
  bottom.addColorStop(1, 'rgba(5,10,16,0.6)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
  if (env.highContrast) {
    ctx.fillStyle = 'rgba(8,6,14,0.72)';
    ctx.fillRect(0, 0, width, height);
  }
}

// --- Ambient ------------------------------------------------------------------------
const FIREFLIES = 16;
const GLITTER = 22;

export function paintAmbient(ctx: Ctx2D, width: number, height: number, time: number): void {
  layout(width, height);
  const t = time * 0.001;
  const u = unit;

  // Lanterns breathe: a pale core that swells and fades, each on its own beat.
  ctx.fillStyle = '#FFF0C8';
  for (let i = 0; i < LANTERNS; i++) {
    placeLantern(i, width, height);
    if (lanternS < u * 2.4) continue;
    const beat = 0.5 + 0.5 * Math.sin(t * (1.1 + 1.7 * hash(i, 5)) + i * 2.1) * Math.sin(t * 0.37 + i);
    ctx.globalAlpha = 0.1 + 0.22 * beat;
    ctx.beginPath();
    ctx.ellipse(lanternX, lanternY - lanternS * 0.58, lanternS * 0.36, lanternS * 0.4, 0, 0, TAU);
    ctx.fill();
  }

  // Glitter on the moon's path.
  const depth = height - horizon;
  ctx.fillStyle = '#FFE2A8';
  for (let i = 0; i < GLITTER; i++) {
    const f = hash(i, 151);
    const tw = Math.sin(t * (0.9 + 1.6 * hash(i, 152)) + i * 1.9);
    if (tw <= 0) continue;
    const y = horizon + depth * (0.02 + 0.7 * f * f);
    const x = moonX + (hash(i, 153) - 0.5) * moonR * (0.8 + 3 * f) + Math.sin(t * 0.3 + i) * u * 2;
    const half = u * (2 + 9 * hash(i, 154)) * (0.5 + f);
    ctx.globalAlpha = 0.5 * tw * (1 - f * 0.7);
    ctx.fillRect(x - half, y, half * 2, Math.max(1, u * (0.8 + f)));
  }

  // Two sky lanterns, far away, rising for a minute and a half each.
  ctx.fillStyle = '#FFC470';
  for (let i = 0; i < 2; i++) {
    const p = (t / 90 + i * 0.47) % 1;
    const x = width * (0.18 + 0.3 * i + 0.05 * Math.sin(p * 5 + i)) + p * width * 0.08;
    const y = horizon * (0.9 - 0.8 * p);
    const fade = Math.min(1, p * 8) * Math.min(1, (1 - p) * 5);
    ctx.globalAlpha = 0.16 * fade;
    ctx.beginPath();
    ctx.arc(x, y, 4.4 * u, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillRect(x - 1.1 * u, y - 1.5 * u, 2.2 * u, 3 * u);
  }

  // Fireflies: by the reeds, under the boughs and along the sides. Halo, then the spark.
  ctx.fillStyle = '#E4F58C';
  for (let i = 0; i < FIREFLIES; i++) {
    const blink = Math.sin(t * (0.7 + 0.9 * hash(i, 161)) + i * 4.3);
    if (blink <= 0) continue;
    const low = i % 4 !== 0;
    const side = i % 2 === 0 ? 0 : 1;
    const bx = side === 0 ? width * (0.02 + 0.3 * hash(i, 162)) : width * (0.98 - 0.3 * hash(i, 162));
    const by = low ? height * (0.8 + 0.18 * hash(i, 163)) : height * (0.05 + 0.12 * hash(i, 163));
    const x = bx + Math.sin(t * (0.21 + 0.2 * hash(i, 164)) + i) * 26 * u + Math.sin(t * 0.83 + i * 2) * 5 * u;
    const y = by + Math.cos(t * (0.17 + 0.22 * hash(i, 165)) + i * 3) * 18 * u + Math.sin(t * 1.1 + i) * 3 * u;
    ctx.globalAlpha = 0.16 * blink;
    ctx.beginPath();
    ctx.arc(x, y, 4.6 * u, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = Math.min(1, 1.2 * blink);
    ctx.beginPath();
    ctx.arc(x, y, 1.25 * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
