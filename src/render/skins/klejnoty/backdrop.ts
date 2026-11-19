/**
 * The world behind the screen: a master jeweller's bench at night. Walnut panelling
 * and a window onto the night city above, the rosewood bench with a green leather
 * work pad below, a banker's lamp upper left whose warm pool is the one light of the
 * whole skin. Detail sits at the top and in the corners; the middle, where the tray
 * lies, is quiet leather.
 *
 * `paintScene` runs once per size. `paintAmbient` adds dust drifting through the lamp
 * beam and a few slow glints on brass and glass with flat fills and no allocation.
 */
import type { Ctx2D, PaintEnv } from '../../skin';
import { lcg } from './bed';

interface Layout {
  readonly w: number;
  readonly h: number;
  /** Size unit: 1 on a 360 px wide phone. */
  readonly s: number;
  readonly portrait: boolean;
  /** Back edge of the bench. */
  readonly y0: number;
  /** Mouth of the lamp shade. */
  readonly lampX: number;
  readonly lampY: number;
  readonly win: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly chest: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly pad: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

function layout(w: number, h: number): Layout {
  const portrait = w < h * 0.9;
  const s = Math.max(0.75, Math.min(w / 360, h / 640));
  if (portrait) {
    const y0 = h * 0.3;
    const chestH = Math.min(h * 0.07, 58 * s);
    return {
      w,
      h,
      s,
      portrait,
      y0,
      lampX: w * 0.25,
      lampY: h * 0.085,
      win: { x: w * 0.6, y: h * 0.03, w: w * 0.33, h: h * 0.178 },
      chest: { x: w * 0.57, y: y0 - chestH, w: w * 0.5, h: chestH },
      pad: { x: w * 0.03, y: y0 + h * 0.03, w: w * 0.94, h: h * 0.7 - h * 0.075 },
    };
  }
  const y0 = h * 0.4;
  const padW = Math.min(w * 0.6, h * 0.86);
  const chestH = h * 0.13;
  return {
    w,
    h,
    s,
    portrait,
    y0,
    lampX: w * 0.2,
    lampY: h * 0.15,
    win: { x: w * 0.68, y: h * 0.05, w: Math.min(w * 0.2, h * 0.34), h: h * 0.27 },
    chest: { x: w * 0.66, y: y0 - chestH, w: w * 0.27, h: chestH },
    pad: { x: (w - padW) / 2, y: y0 + h * 0.035, w: padW, h: h - y0 - h * 0.06 },
  };
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, rad: number): void {
  const r = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function brass(ctx: Ctx2D, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#FFF1BC');
  g.addColorStop(0.22, '#E4B95F');
  g.addColorStop(0.55, '#94672A');
  g.addColorStop(0.78, '#D2A552');
  g.addColorStop(1, '#5E3D12');
  return g;
}

/** Wood grain: long thin wavering strokes, light and dark, inside a clip set by the caller. */
function grain(ctx: Ctx2D, x: number, y: number, w: number, h: number, count: number, seed: number, vertical: boolean): void {
  const next = lcg(seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const along = vertical ? h : w;
    const across = vertical ? w : h;
    const a0 = next() * along;
    const len = along * (0.12 + next() * 0.5);
    const c0 = next() * across;
    const wob = (next() - 0.5) * 7;
    ctx.strokeStyle = next() > 0.42 ? `rgba(12,4,2,${0.07 + next() * 0.2})` : `rgba(255,170,110,${0.03 + next() * 0.07})`;
    ctx.lineWidth = 0.5 + next() * 1.3;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(x + c0, y + a0);
      ctx.quadraticCurveTo(x + c0 + wob, y + a0 + len / 2, x + c0 + wob * 0.3, y + a0 + len);
    } else {
      ctx.moveTo(x + a0, y + c0);
      ctx.quadraticCurveTo(x + a0 + len / 2, y + c0 + wob, x + a0 + len, y + c0 + wob * 0.3);
    }
    ctx.stroke();
  }
}

function paintWall(ctx: Ctx2D, L: Layout): void {
  const { w, y0, s } = L;
  const base = ctx.createLinearGradient(0, 0, 0, y0);
  base.addColorStop(0, '#1E110C');
  base.addColorStop(1, '#3A2117');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, y0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, y0);
  ctx.clip();
  grain(ctx, 0, 0, w, y0, Math.round((w * y0) / 900), 5, true);
  // Raised panels: lamp-side edges shaded, far edges lit.
  const panelW = (L.portrait ? 118 : 150) * s;
  const top = y0 * 0.07;
  const bottom = y0 * 0.9;
  for (let x = -panelW * 0.35; x < w; x += panelW) {
    const px = x + panelW * 0.1;
    const pw = panelW * 0.8;
    ctx.lineWidth = Math.max(1, 1.6 * s);
    ctx.strokeStyle = 'rgba(8,3,2,0.6)';
    ctx.beginPath();
    ctx.moveTo(px, bottom);
    ctx.lineTo(px, top);
    ctx.lineTo(px + pw, top);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,130,0.16)';
    ctx.beginPath();
    ctx.moveTo(px + pw, top);
    ctx.lineTo(px + pw, bottom);
    ctx.lineTo(px, bottom);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(8,3,2,0.35)';
    ctx.lineWidth = Math.max(1, s);
    ctx.strokeRect(px + 7 * s, top + 7 * s, pw - 14 * s, bottom - top - 14 * s);
  }
  // Rail where the wall meets the bench.
  const rail = ctx.createLinearGradient(0, y0 * 0.93, 0, y0);
  rail.addColorStop(0, '#4A2A1C');
  rail.addColorStop(0.3, '#5C3524');
  rail.addColorStop(1, '#170A06');
  ctx.fillStyle = rail;
  ctx.fillRect(0, y0 * 0.93, w, y0 * 0.07);
  ctx.fillStyle = 'rgba(255,200,140,0.22)';
  ctx.fillRect(0, y0 * 0.93, w, Math.max(1, s));
  ctx.restore();
}

function paintWindow(ctx: Ctx2D, L: Layout): void {
  const { s } = L;
  const { x, y, w, h } = L.win;
  const f = 7 * s;
  // Recess shadow, then the frame.
  ctx.fillStyle = 'rgba(6,2,1,0.55)';
  roundRect(ctx, x - f - 3 * s, y - f - 2 * s, w + f * 2 + 8 * s, h + f * 2 + 9 * s, 3 * s);
  ctx.fill();
  const frame = ctx.createLinearGradient(x - f, y - f, x + w + f, y + h + f);
  frame.addColorStop(0, '#6B3E27');
  frame.addColorStop(0.5, '#3E2116');
  frame.addColorStop(1, '#24110A');
  ctx.fillStyle = frame;
  roundRect(ctx, x - f, y - f, w + f * 2, h + f * 2, 2 * s);
  ctx.fill();
  // Night sky.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#071230');
  sky.addColorStop(0.55, '#14305A');
  sky.addColorStop(0.86, '#35507A');
  sky.addColorStop(1, '#6C6A86');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const next = lcg(29);
  for (let i = 0; i < 34; i++) {
    const sx = x + next() * w;
    const sy = y + next() * h * 0.62;
    ctx.fillStyle = `rgba(230,240,255,${0.25 + next() * 0.6})`;
    ctx.beginPath();
    ctx.arc(sx, sy, (0.35 + next() * 0.7) * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Moon with its halo.
  const mx = x + w * 0.7;
  const my = y + h * 0.24;
  const halo = ctx.createRadialGradient(mx, my, 0, mx, my, w * 0.42);
  halo.addColorStop(0, 'rgba(210,225,255,0.5)');
  halo.addColorStop(0.3, 'rgba(160,190,240,0.16)');
  halo.addColorStop(1, 'rgba(160,190,240,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, w, h);
  const moon = ctx.createRadialGradient(mx - 2 * s, my - 2 * s, 0, mx, my, 8 * s);
  moon.addColorStop(0, '#FFFDF2');
  moon.addColorStop(1, '#D5DDF0');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(mx, my, 7.5 * s, 0, Math.PI * 2);
  ctx.fill();
  // Roofs and towers of the old town, a few windows still lit.
  ctx.fillStyle = '#0A1226';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  let rx = x;
  let ry = y + h * 0.8;
  ctx.lineTo(rx, ry);
  while (rx < x + w) {
    const step = (7 + next() * 15) * s;
    const kind = next();
    const top = y + h * (0.7 + next() * 0.16);
    if (kind > 0.72) {
      // gable
      ctx.lineTo(rx, ry);
      ctx.lineTo(rx + step / 2, top - 6 * s);
      ctx.lineTo(rx + step, ry);
    } else if (kind > 0.6) {
      // spire
      ctx.lineTo(rx + step * 0.3, ry);
      ctx.lineTo(rx + step * 0.5, top - 16 * s);
      ctx.lineTo(rx + step * 0.7, ry);
    } else {
      ctx.lineTo(rx, top);
      ctx.lineTo(rx + step, top);
      ry = top;
    }
    rx += step;
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(255,${190 + Math.round(next() * 40)},110,${0.5 + next() * 0.5})`;
    ctx.fillRect(x + next() * w, y + h * (0.88 + next() * 0.1), 1.6 * s, 2.2 * s);
  }
  // Glass: the room's lamp mirrored faintly in the panes.
  const glass = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
  glass.addColorStop(0, 'rgba(255,205,140,0.2)');
  glass.addColorStop(0.3, 'rgba(255,205,140,0.03)');
  glass.addColorStop(1, 'rgba(255,205,140,0)');
  ctx.fillStyle = glass;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y);
  ctx.lineTo(x + w * 0.34, y);
  ctx.lineTo(x - w * 0.1, y + h);
  ctx.lineTo(x - w * 0.34, y + h);
  ctx.fill();
  // Inner shadow of the frame on the glass.
  const inner = ctx.createLinearGradient(x, y, x + 9 * s, y + 12 * s);
  inner.addColorStop(0, 'rgba(0,0,0,0.6)');
  inner.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = inner;
  ctx.fillRect(x, y, w, 10 * s);
  ctx.fillRect(x, y, 8 * s, h);
  ctx.restore();
  // Glazing bars: lit on their lamp side.
  const bar = 3 * s;
  const bars: readonly (readonly [number, number, number, number])[] = [
    [x + w / 2 - bar / 2, y, bar, h],
    [x, y + h * 0.36 - bar / 2, w, bar],
    [x, y + h * 0.69 - bar / 2, w, bar],
  ];
  for (const [bx, by, bw, bh] of bars) {
    ctx.fillStyle = '#34190F';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255,190,125,0.4)';
    if (bw < bh) ctx.fillRect(bx, by, Math.max(1, s * 0.9), bh);
    else ctx.fillRect(bx, by, bw, Math.max(1, s * 0.9));
  }
  // Frame edges and the sill.
  ctx.strokeStyle = 'rgba(255,195,130,0.42)';
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath();
  ctx.moveTo(x - f + 0.5, y + h + f);
  ctx.lineTo(x - f + 0.5, y - f + 0.5);
  ctx.lineTo(x + w + f, y - f + 0.5);
  ctx.stroke();
  const sill = ctx.createLinearGradient(0, y + h + f, 0, y + h + f + 7 * s);
  sill.addColorStop(0, '#8A5536');
  sill.addColorStop(0.25, '#5A3220');
  sill.addColorStop(1, '#1E0E08');
  ctx.fillStyle = sill;
  roundRect(ctx, x - f - 5 * s, y + h + f - 1, w + f * 2 + 10 * s, 7 * s, 1.5 * s);
  ctx.fill();
}

function paintChest(ctx: Ctx2D, L: Layout): void {
  const { s } = L;
  const { x, y, w, h } = L.chest;
  // Shadow it throws on the wall and bench, away from the lamp.
  ctx.fillStyle = 'rgba(5,2,1,0.4)';
  ctx.fillRect(x + 6 * s, y + 5 * s, w, h + 3 * s);
  const body = ctx.createLinearGradient(x, y, x, y + h);
  body.addColorStop(0, '#5E2C1C');
  body.addColorStop(1, '#2F130C');
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  grain(ctx, x, y, w, h, Math.round((w * h) / 260), 17, false);
  ctx.restore();
  const cols = L.portrait ? 3 : 4;
  const rows = 2;
  const gap = 3.5 * s;
  const top = 5 * s;
  const dw = (w - gap) / cols - gap;
  const dh = (h - top - gap) / rows - gap;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const dx = x + gap + col * (dw + gap);
      const dy = y + top + row * (dh + gap);
      const face = ctx.createLinearGradient(dx, dy, dx + dw * 0.4, dy + dh);
      face.addColorStop(0, '#7A3B25');
      face.addColorStop(1, '#431C11');
      ctx.fillStyle = face;
      ctx.fillRect(dx, dy, dw, dh);
      // Bevel: lit top and left, shaded bottom and right.
      ctx.fillStyle = 'rgba(255,200,140,0.32)';
      ctx.fillRect(dx, dy, dw, Math.max(1, s));
      ctx.fillRect(dx, dy, Math.max(1, s), dh);
      ctx.fillStyle = 'rgba(8,2,1,0.55)';
      ctx.fillRect(dx, dy + dh - Math.max(1, s), dw, Math.max(1, s));
      ctx.fillRect(dx + dw - Math.max(1, s), dy, Math.max(1, s), dh);
      // Brass label frame and knob.
      const kx = dx + dw / 2;
      const ky = dy + dh * 0.64;
      const kr = Math.min(dh * 0.17, 3.4 * s);
      ctx.fillStyle = 'rgba(5,1,0,0.5)';
      ctx.beginPath();
      ctx.arc(kx + kr * 0.4, ky + kr * 0.5, kr, 0, Math.PI * 2);
      ctx.fill();
      const knob = ctx.createRadialGradient(kx - kr * 0.4, ky - kr * 0.4, 0, kx, ky, kr);
      knob.addColorStop(0, '#FFF3C4');
      knob.addColorStop(0.45, '#D9AA52');
      knob.addColorStop(1, '#6A4515');
      ctx.fillStyle = knob;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fill();
      if (dh > 14 * s) {
        const lw = dw * 0.42;
        const lh = dh * 0.22;
        ctx.fillStyle = '#E9DDC0';
        ctx.fillRect(kx - lw / 2, dy + dh * 0.16, lw, lh);
        ctx.strokeStyle = '#C39647';
        ctx.lineWidth = Math.max(1, s * 0.9);
        ctx.strokeRect(kx - lw / 2, dy + dh * 0.16, lw, lh);
      }
    }
  }
  // Top slab with a lit edge.
  const slab = ctx.createLinearGradient(0, y - 3 * s, 0, y + 2 * s);
  slab.addColorStop(0, '#9A5A3A');
  slab.addColorStop(1, '#3A1A10');
  ctx.fillStyle = slab;
  ctx.fillRect(x - 3 * s, y - 3 * s, w + 6 * s, 5 * s);
  ctx.fillStyle = 'rgba(255,210,150,0.5)';
  ctx.fillRect(x - 3 * s, y - 3 * s, w + 6 * s, Math.max(1, s * 0.8));
}

/** A glass bell jar with a ring stone on a small stand: silhouetted against the window. */
function paintBellJar(ctx: Ctx2D, L: Layout): void {
  const { s } = L;
  const bx = L.chest.x + L.chest.w * (L.portrait ? 0.2 : 0.24);
  const by = L.chest.y - 3 * s;
  const jw = 15 * s;
  const jh = 38 * s;
  // Turned wooden foot.
  const foot = ctx.createLinearGradient(bx - jw, 0, bx + jw, 0);
  foot.addColorStop(0, '#8A5234');
  foot.addColorStop(0.4, '#5A2E1C');
  foot.addColorStop(1, '#22100A');
  ctx.fillStyle = foot;
  roundRect(ctx, bx - jw - 3 * s, by - 5 * s, jw * 2 + 6 * s, 5 * s, 2 * s);
  ctx.fill();
  // Stand and stone.
  ctx.fillStyle = brass(ctx, bx - 3 * s, 0, bx + 3 * s, 0);
  ctx.beginPath();
  ctx.moveTo(bx - 4 * s, by - 5 * s);
  ctx.lineTo(bx - 1.2 * s, by - 17 * s);
  ctx.lineTo(bx + 1.2 * s, by - 17 * s);
  ctx.lineTo(bx + 4 * s, by - 5 * s);
  ctx.fill();
  const stone = ctx.createLinearGradient(bx - 5 * s, by - 26 * s, bx + 5 * s, by - 16 * s);
  stone.addColorStop(0, '#FFFFFF');
  stone.addColorStop(0.4, '#9FD4FF');
  stone.addColorStop(1, '#2459C8');
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(bx, by - 15 * s);
  ctx.lineTo(bx - 5.5 * s, by - 22 * s);
  ctx.lineTo(bx - 3 * s, by - 25 * s);
  ctx.lineTo(bx + 3 * s, by - 25 * s);
  ctx.lineTo(bx + 5.5 * s, by - 22 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = Math.max(0.6, s * 0.6);
  ctx.beginPath();
  ctx.moveTo(bx - 5.5 * s, by - 22 * s);
  ctx.lineTo(bx + 5.5 * s, by - 22 * s);
  ctx.moveTo(bx - 3 * s, by - 25 * s);
  ctx.lineTo(bx - 1.5 * s, by - 22 * s);
  ctx.lineTo(bx, by - 15 * s);
  ctx.lineTo(bx + 1.5 * s, by - 22 * s);
  ctx.lineTo(bx + 3 * s, by - 25 * s);
  ctx.stroke();
  // The glass dome.
  ctx.beginPath();
  ctx.moveTo(bx - jw, by - 5 * s);
  ctx.lineTo(bx - jw, by - jh + jw);
  ctx.arc(bx, by - jh + jw, jw, Math.PI, 0);
  ctx.lineTo(bx + jw, by - 5 * s);
  ctx.closePath();
  const glass = ctx.createLinearGradient(bx - jw, 0, bx + jw, 0);
  glass.addColorStop(0, 'rgba(255,240,215,0.3)');
  glass.addColorStop(0.2, 'rgba(255,240,215,0.06)');
  glass.addColorStop(0.8, 'rgba(180,210,255,0.05)');
  glass.addColorStop(1, 'rgba(180,210,255,0.22)');
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,245,225,0.5)';
  ctx.lineWidth = Math.max(0.8, s * 0.9);
  ctx.stroke();
  // Lamp streak down the near side of the dome, and the knob on top.
  ctx.strokeStyle = 'rgba(255,250,235,0.85)';
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(bx, by - jh + jw, jw * 0.72, Math.PI * 1.08, Math.PI * 1.36);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx - jw * 0.72, by - jh + jw + 3 * s);
  ctx.lineTo(bx - jw * 0.72, by - 12 * s);
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const knob = ctx.createRadialGradient(bx - s, by - jh - 3 * s, 0, bx, by - jh - 2 * s, 3.2 * s);
  knob.addColorStop(0, 'rgba(255,255,255,0.95)');
  knob.addColorStop(1, 'rgba(200,220,255,0.25)');
  ctx.fillStyle = knob;
  ctx.beginPath();
  ctx.arc(bx, by - jh - 2 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  // Two ledgers lying beside it.
  const lx = L.chest.x + L.chest.w * (L.portrait ? 0.46 : 0.5);
  const books: readonly (readonly [number, number, string, string])[] = [
    [46, 7, '#233F36', '#3D6B5B'],
    [40, 6, '#5A1826', '#8E2E42'],
  ];
  let ly = by;
  let k = 0;
  for (const [bw, bh, dark, light] of books) {
    const g = ctx.createLinearGradient(0, ly - bh * s, 0, ly);
    g.addColorStop(0, light);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    roundRect(ctx, lx + k * 4 * s, ly - bh * s, bw * s, bh * s, 1.2 * s);
    ctx.fill();
    ctx.fillStyle = '#E9DDC0';
    ctx.fillRect(lx + k * 4 * s + bw * s - 2.4 * s, ly - bh * s + 1.3 * s, 2 * s, bh * s - 2.6 * s);
    ctx.fillStyle = 'rgba(227,186,107,0.9)';
    ctx.fillRect(lx + k * 4 * s + 6 * s, ly - bh * s + bh * s * 0.42, 9 * s, Math.max(1, s * 0.9));
    ly -= bh * s;
    k++;
  }
}

function paintBench(ctx: Ctx2D, L: Layout): void {
  const { w, h, y0, s } = L;
  const base = ctx.createLinearGradient(0, y0, 0, h);
  base.addColorStop(0, '#532518');
  base.addColorStop(0.45, '#3F1A11');
  base.addColorStop(1, '#210C07');
  ctx.fillStyle = base;
  ctx.fillRect(0, y0, w, h - y0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, w, h - y0);
  ctx.clip();
  grain(ctx, 0, y0, w, h - y0, Math.round((w * (h - y0)) / 520), 3, false);
  // Board seams, wider apart towards the viewer.
  let sy = y0 + 26 * s;
  let gap = 34 * s;
  while (sy < h) {
    ctx.fillStyle = 'rgba(8,2,1,0.5)';
    ctx.fillRect(0, sy, w, Math.max(1, s));
    ctx.fillStyle = 'rgba(255,180,120,0.09)';
    ctx.fillRect(0, sy + Math.max(1, s), w, Math.max(1, s));
    sy += gap;
    gap *= 1.32;
  }
  // Shadow where wall meets bench.
  const occ = ctx.createLinearGradient(0, y0, 0, y0 + 16 * s);
  occ.addColorStop(0, 'rgba(6,2,1,0.75)');
  occ.addColorStop(1, 'rgba(6,2,1,0)');
  ctx.fillStyle = occ;
  ctx.fillRect(0, y0, w, 16 * s);
  ctx.restore();
}

function paintPad(ctx: Ctx2D, L: Layout): void {
  const { s } = L;
  const { x, y, w, h } = L.pad;
  const rad = 10 * s;
  // Thickness and cast shadow, away from the lamp.
  ctx.save();
  ctx.shadowColor = 'rgba(4,1,0,0.7)';
  ctx.shadowBlur = 14 * s;
  ctx.shadowOffsetX = 4 * s;
  ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = '#0A1512';
  roundRect(ctx, x, y, w, h, rad);
  ctx.fill();
  ctx.restore();
  const leather = ctx.createRadialGradient(x + w * 0.2, y, 0, x + w * 0.2, y, Math.hypot(w, h));
  leather.addColorStop(0, '#255044');
  leather.addColorStop(0.4, '#173A31');
  leather.addColorStop(1, '#0B1D18');
  ctx.fillStyle = leather;
  roundRect(ctx, x, y, w, h, rad);
  ctx.fill();
  // Leather grain: tiny pores.
  ctx.save();
  roundRect(ctx, x, y, w, h, rad);
  ctx.clip();
  const next = lcg(41);
  const pores = Math.round((w * h) / 34);
  for (let i = 0; i < pores; i++) {
    ctx.fillStyle = next() > 0.5 ? `rgba(0,0,0,${0.08 + next() * 0.14})` : `rgba(160,230,200,${0.02 + next() * 0.045})`;
    ctx.fillRect(x + next() * w, y + next() * h, 0.6 + next() * 1.2, 0.6 + next() * 1.2);
  }
  ctx.restore();
  // Lit near edge, gold tooling inside.
  ctx.strokeStyle = 'rgba(190,255,225,0.22)';
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + h - rad);
  ctx.lineTo(x + 0.5, y + rad);
  ctx.arcTo(x + 0.5, y + 0.5, x + rad, y + 0.5, rad);
  ctx.lineTo(x + w - rad, y + 0.5);
  ctx.stroke();
  const inset = 6.5 * s;
  ctx.strokeStyle = 'rgba(227,186,107,0.6)';
  ctx.lineWidth = Math.max(0.8, s * 0.9);
  roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, rad * 0.55);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(227,186,107,0.28)';
  roundRect(ctx, x + inset + 3 * s, y + inset + 3 * s, w - inset * 2 - 6 * s, h - inset * 2 - 6 * s, rad * 0.4);
  ctx.stroke();
}

function paintLamp(ctx: Ctx2D, L: Layout): void {
  const { s, y0 } = L;
  const mx = L.lampX;
  const my = L.lampY;
  const u = (L.portrait ? 1 : 1.5) * s;
  const baseX = mx - 62 * u;
  const baseY = y0 + 5 * s;
  // Arm: a brass gooseneck from the base up and over to the shade.
  const topX = mx - 34 * u;
  const topY = my - 30 * u;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3F2A0C';
  ctx.lineWidth = 6.5 * u;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY - 4 * u);
  ctx.bezierCurveTo(baseX - 26 * u, baseY - (baseY - topY) * 0.5, baseX - 10 * u, topY - 14 * u, topX, topY);
  ctx.stroke();
  ctx.strokeStyle = brass(ctx, baseX - 20 * u, 0, baseX + 20 * u, 0);
  ctx.lineWidth = 5 * u;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,244,200,0.75)';
  ctx.lineWidth = 1.1 * u;
  ctx.stroke();
  // Base on the bench.
  ctx.fillStyle = 'rgba(4,1,0,0.55)';
  ctx.beginPath();
  ctx.ellipse(baseX + 9 * u, baseY + 4 * u, 30 * u, 7 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = brass(ctx, baseX - 26 * u, baseY - 10 * u, baseX + 26 * u, baseY + 6 * u);
  ctx.beginPath();
  ctx.ellipse(baseX, baseY, 25 * u, 6.5 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(baseX, baseY - 4 * u, 14 * u, 5 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,246,205,0.8)';
  ctx.lineWidth = Math.max(0.8, 0.9 * u);
  ctx.beginPath();
  ctx.ellipse(baseX, baseY - 1 * u, 24 * u, 5.6 * u, 0, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();

  // Shade: green enamel over brass, mouth turned down and to the right.
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(0.42);
  const mouthW = 34 * u;
  const depth = 30 * u;
  // Inside of the shade, glowing.
  const inside = ctx.createRadialGradient(0, -2 * u, 0, 0, -2 * u, mouthW);
  inside.addColorStop(0, '#FFFBE8');
  inside.addColorStop(0.4, '#FFE2A0');
  inside.addColorStop(1, '#D08A30');
  ctx.fillStyle = inside;
  ctx.beginPath();
  ctx.ellipse(0, 0, mouthW, 8.5 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  // Outside.
  const enamel = ctx.createLinearGradient(-mouthW, -depth, mouthW, 0);
  enamel.addColorStop(0, '#7FD8B4');
  enamel.addColorStop(0.18, '#2E8F70');
  enamel.addColorStop(0.55, '#0F4A3A');
  enamel.addColorStop(1, '#06241C');
  ctx.fillStyle = enamel;
  ctx.beginPath();
  ctx.moveTo(-mouthW, 0);
  ctx.bezierCurveTo(-mouthW * 0.96, -depth * 0.75, -mouthW * 0.5, -depth, 0, -depth);
  ctx.bezierCurveTo(mouthW * 0.5, -depth, mouthW * 0.96, -depth * 0.75, mouthW, 0);
  ctx.ellipse(0, 0, mouthW, 8.5 * u, 0, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // Gloss streak on the enamel and the brass lip.
  ctx.strokeStyle = 'rgba(220,255,240,0.7)';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(-mouthW * 0.78, -depth * 0.42);
  ctx.quadraticCurveTo(-mouthW * 0.6, -depth * 0.82, -mouthW * 0.22, -depth * 0.9);
  ctx.stroke();
  ctx.strokeStyle = brass(ctx, -mouthW, 0, mouthW, 0);
  ctx.lineWidth = 2.2 * u;
  ctx.beginPath();
  ctx.ellipse(0, 0, mouthW, 8.5 * u, 0, Math.PI, Math.PI * 2, true);
  ctx.stroke();
  // Brass cap where the arm joins.
  ctx.fillStyle = brass(ctx, -8 * u, -depth - 8 * u, 8 * u, -depth + 2 * u);
  roundRect(ctx, -7 * u, -depth - 6 * u, 14 * u, 8 * u, 2.5 * u);
  ctx.fill();
  ctx.restore();
}

function paintLight(ctx: Ctx2D, L: Layout): void {
  const { w, h } = L;
  const mx = L.lampX + 6 * L.s;
  const my = L.lampY + 8 * L.s;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // The pool of lamp light on wall and bench.
  const reach = Math.max(w, h) * (L.portrait ? 0.78 : 0.62);
  const pool = ctx.createRadialGradient(mx, my, 0, mx + reach * 0.1, my + reach * 0.22, reach);
  pool.addColorStop(0, 'rgba(255,214,150,0.5)');
  pool.addColorStop(0.18, 'rgba(255,190,120,0.26)');
  pool.addColorStop(0.5, 'rgba(255,170,100,0.09)');
  pool.addColorStop(1, 'rgba(255,170,100,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);
  // The beam itself, widening down and to the right.
  const beam = ctx.createLinearGradient(mx, my, mx + reach * 0.3, my + reach * 0.62);
  beam.addColorStop(0, 'rgba(255,228,170,0.22)');
  beam.addColorStop(1, 'rgba(255,228,170,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(mx - 30 * L.s, my);
  ctx.lineTo(mx + 30 * L.s, my + 10 * L.s);
  ctx.lineTo(mx + reach * 0.72, my + reach * 0.7);
  ctx.lineTo(mx - reach * 0.22, my + reach * 0.8);
  ctx.closePath();
  ctx.fill();
  // Glare at the bulb.
  const glare = ctx.createRadialGradient(mx, my, 0, mx, my, 46 * L.s);
  glare.addColorStop(0, 'rgba(255,246,215,0.75)');
  glare.addColorStop(0.3, 'rgba(255,220,150,0.25)');
  glare.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = glare;
  ctx.fillRect(mx - 50 * L.s, my - 50 * L.s, 100 * L.s, 100 * L.s);
  ctx.restore();
}

function paintForeground(ctx: Ctx2D, L: Layout): void {
  const { w, h, s } = L;
  const u = (L.portrait ? 1 : 1.5) * s;
  // Loupe, bottom left: brass ring, lens, the stub of its handle running off the edge.
  const lx = L.portrait ? w * 0.075 : w * 0.11;
  const ly = L.portrait ? h * 0.972 : h * 0.86;
  const lr = 27 * u;
  ctx.fillStyle = 'rgba(4,1,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(lx + 6 * u, ly + 8 * u, lr * 1.05, lr * 1.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2B1608';
  ctx.lineWidth = 10 * u;
  ctx.beginPath();
  ctx.moveTo(lx - lr * 0.7, ly + lr * 0.7);
  ctx.lineTo(lx - lr * 2.2, ly + lr * 2.2);
  ctx.stroke();
  const lens = ctx.createRadialGradient(lx - lr * 0.3, ly - lr * 0.35, 0, lx, ly, lr);
  lens.addColorStop(0, 'rgba(255,238,205,0.34)');
  lens.addColorStop(0.6, 'rgba(210,225,235,0.1)');
  lens.addColorStop(1, 'rgba(120,160,190,0.22)');
  ctx.fillStyle = lens;
  ctx.beginPath();
  ctx.arc(lx, ly, lr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = brass(ctx, lx - lr, ly - lr, lx + lr, ly + lr);
  ctx.lineWidth = 5.5 * u;
  ctx.beginPath();
  ctx.arc(lx, ly, lr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,215,0.9)';
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  ctx.arc(lx, ly, lr + 1.4 * u, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2.2 * u;
  ctx.beginPath();
  ctx.arc(lx, ly, lr * 0.68, Math.PI * 1.12, Math.PI * 1.42);
  ctx.stroke();

  // Tweezers, bottom right: two slim steel blades meeting at a point.
  const tx = L.portrait ? w * 0.86 : w * 0.87;
  const ty = L.portrait ? h * 0.972 : h * 0.9;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(-0.5);
  ctx.fillStyle = 'rgba(4,1,0,0.45)';
  ctx.beginPath();
  ctx.moveTo(-34 * u, 4 * u);
  ctx.lineTo(62 * u, -2 * u);
  ctx.lineTo(62 * u, 11 * u);
  ctx.closePath();
  ctx.fill();
  const steel = ctx.createLinearGradient(0, -7 * u, 0, 7 * u);
  steel.addColorStop(0, '#F4F1EA');
  steel.addColorStop(0.45, '#9EA3A8');
  steel.addColorStop(1, '#3C4046');
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(-36 * u, 0);
  ctx.lineTo(62 * u, -7 * u);
  ctx.lineTo(62 * u, -3.4 * u);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-36 * u, 0);
  ctx.lineTo(62 * u, 3.4 * u);
  ctx.lineTo(62 * u, 7 * u);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Anchors of the ambient layer, set by the last static paint (numbers only).
let lampMouthX = 0;
let lampMouthY = 0;
let beamReach = 0;
let glintAx = 0;
let glintAy = 0;
let glintBx = 0;
let glintBy = 0;
let glintCx = 0;
let glintCy = 0;
let unit = 1;

export function paintScene(ctx: Ctx2D, width: number, height: number, env: PaintEnv): void {
  if (env.highContrast) {
    ctx.fillStyle = '#0B0504';
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const L = layout(width, height);
  paintWall(ctx, L);
  paintWindow(ctx, L);
  paintBench(ctx, L);
  paintChest(ctx, L);
  paintBellJar(ctx, L);
  paintPad(ctx, L);
  paintForeground(ctx, L);
  paintLight(ctx, L);
  paintLamp(ctx, L);
  // Night closes in at the edges of the lamp's reach.
  const vig = ctx.createRadialGradient(width * 0.4, height * 0.36, Math.min(width, height) * 0.35, width * 0.5, height * 0.5, Math.hypot(width, height) * 0.62);
  vig.addColorStop(0, 'rgba(8,3,2,0)');
  vig.addColorStop(1, 'rgba(8,3,2,0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  lampMouthX = L.lampX;
  lampMouthY = L.lampY;
  beamReach = Math.max(width, height) * (L.portrait ? 0.4 : 0.32);
  unit = L.s;
  // Glints: the jar's knob, the moon-side star of the window, the brass of the loupe.
  glintAx = L.chest.x + L.chest.w * (L.portrait ? 0.2 : 0.24) - 4 * L.s;
  glintAy = L.chest.y - 34 * L.s;
  glintBx = L.win.x + L.win.w * 0.2;
  glintBy = L.win.y + L.win.h * 0.16;
  glintCx = (L.portrait ? width * 0.075 : width * 0.11) - 16 * L.s;
  glintCy = (L.portrait ? height * 0.972 : height * 0.86) - 22 * L.s;
}

// Dust motes: fixed parameters, positions derived from time.
const MOTES = 16;
const moteA = new Float32Array(MOTES);
const moteB = new Float32Array(MOTES);
const moteSize = new Float32Array(MOTES);
const moteSpeed = new Float32Array(MOTES);
for (let i = 0; i < MOTES; i++) {
  moteA[i] = (i * 0.618034) % 1;
  moteB[i] = (i * 0.381966 + 0.21) % 1;
  moteSize[i] = 0.5 + ((i * 7) % 5) * 0.22;
  moteSpeed[i] = 0.009 + ((i * 3) % 7) * 0.0025;
}

function star(ctx: Ctx2D, x: number, y: number, size: number): void {
  const w = size * 0.16;
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + w, y - w);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + w, y + w);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - w, y + w);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - w, y - w);
  ctx.closePath();
}

export function paintAmbient(ctx: Ctx2D, _width: number, _height: number, time: number): void {
  if (beamReach <= 0) return;
  const t = time * 0.001;
  // Dust drifting down through the beam; each mote fades in and out along its way.
  ctx.fillStyle = '#FFE6B4';
  for (let i = 0; i < MOTES; i++) {
    const life = ((moteB[i] ?? 0) + t * (moteSpeed[i] ?? 0)) % 1;
    const along = 0.12 + life * 0.88;
    const across = ((moteA[i] ?? 0) - 0.5) * (0.25 + along * 0.9) + Math.sin(t * 0.5 + i * 1.7) * 0.03;
    const x = lampMouthX + beamReach * (along * 0.35 + across * 0.9);
    const y = lampMouthY + beamReach * (along * 0.95 - across * 0.2);
    ctx.globalAlpha = 0.5 * Math.sin(life * Math.PI) * (1 - along * 0.55);
    ctx.beginPath();
    ctx.arc(x, y, (moteSize[i] ?? 1) * unit, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glints, each on its own slow rhythm.
  ctx.fillStyle = '#FFFFFF';
  const a = Math.max(0, Math.sin(t * 0.9));
  const b = Math.max(0, Math.sin(t * 0.63 + 2.1));
  const c = Math.max(0, Math.sin(t * 0.77 + 4.2));
  ctx.globalAlpha = a * a * 0.9;
  ctx.beginPath();
  star(ctx, glintAx, glintAy, (2 + a * 5) * unit);
  ctx.fill();
  ctx.globalAlpha = b * b * 0.8;
  ctx.beginPath();
  star(ctx, glintBx, glintBy, (1.5 + b * 3.5) * unit);
  ctx.fill();
  ctx.globalAlpha = c * c * 0.85;
  ctx.beginPath();
  star(ctx, glintCx, glintCy, (2 + c * 5.5) * unit);
  ctx.fill();
  ctx.globalAlpha = 1;
}
