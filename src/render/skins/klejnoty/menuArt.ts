/**
 * Menu picture: a round presentation tray, gold rim and wine velvet, with one stone
 * of every cut and a beam of light threading through them: the game in one image.
 * The stones are painted by the tile painter itself, large enough to show every facet.
 * A few glints twinkle above it (SVG, animated by the theme CSS).
 */
import type { TileColor } from '../../../game/types';
import type { Ctx2D } from '../../skin';
import { paintVelvet } from './bed';
import { paintGem } from './tile';

const W = 320;
const H = 250;

function paintTray(ctx: Ctx2D, dpr: number): void {
  const cx = W / 2;
  const cy = 124;
  const R = 112;
  // Shadow on the leather, away from the lamp.
  ctx.save();
  ctx.shadowColor = 'rgba(2,0,0,0.75)';
  ctx.shadowBlur = 18 * dpr;
  ctx.shadowOffsetX = 5 * dpr;
  ctx.shadowOffsetY = 9 * dpr;
  ctx.fillStyle = '#1A0A05';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Rim: polished gold, bright towards the lamp, with a turned groove.
  const rim = ctx.createLinearGradient(cx - R * 0.6, cy - R * 0.8, cx + R * 0.6, cy + R * 0.8);
  rim.addColorStop(0, '#FFF4C6');
  rim.addColorStop(0.2, '#EDC670');
  rim.addColorStop(0.48, '#A97A2C');
  rim.addColorStop(0.7, '#E2B65C');
  rim.addColorStop(1, '#69440F');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,40,5,0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,250,220,0.8)';
  ctx.beginPath();
  ctx.arc(cx, cy, R - 5.5, Math.PI * 0.9, Math.PI * 1.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 0.8, Math.PI * 0.95, Math.PI * 1.65);
  ctx.stroke();
  // Velvet well.
  const inner = R - 11;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.clip();
  paintVelvet(ctx, cx - inner, cy - inner, inner * 2, inner * 2, 23);
  // The rim shades the velvet on the lamp side.
  const shade = ctx.createRadialGradient(cx + 10, cy + 14, inner * 0.72, cx, cy, inner);
  shade.addColorStop(0, 'rgba(5,0,2,0)');
  shade.addColorStop(1, 'rgba(5,0,2,0.72)');
  ctx.fillStyle = shade;
  ctx.fillRect(cx - inner, cy - inner, inner * 2, inner * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,20,2,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.stroke();
}

export function createMenuArt(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'klej-art';
  wrap.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintTray(ctx, dpr);
    const r = 33;
    const dx = r * Math.sqrt(3);
    const cx = W / 2;
    const top = 100;
    const bottom = top + r * 1.5;
    const stones: readonly (readonly [TileColor, number, number])[] = [
      ['teal', cx - dx / 2, top],
      ['coral', cx + dx / 2, top],
      ['ice', cx - dx, bottom],
      ['amber', cx, bottom],
      ['lilac', cx + dx, bottom],
    ];
    // The path of light: sapphire, emerald, topaz, ruby, amethyst.
    const order = [2, 0, 3, 1, 4];
    const beam = (width: number, style: string, blur: number): void => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.shadowColor = 'rgba(255,220,150,0.9)';
      ctx.shadowBlur = blur * dpr;
      ctx.beginPath();
      order.forEach((index, i) => {
        const stone = stones[index];
        if (!stone) return;
        if (i === 0) ctx.moveTo(stone[1], stone[2]);
        else ctx.lineTo(stone[1], stone[2]);
      });
      ctx.stroke();
      ctx.restore();
    };
    beam(13, 'rgba(255,214,140,0.5)', 14);
    for (const [color, x, y] of stones) {
      ctx.save();
      paintGem({ ctx, color, state: 'hint2', cx: x, cy: y, r, marks: true, highContrast: false, dpr });
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    beam(5, 'rgba(255,236,190,0.3)', 8);
    beam(1.4, 'rgba(255,255,255,0.75)', 3);
    ctx.globalCompositeOperation = 'source-over';
  }
  const overlay = document.createElement('template');
  const glint = 'M0-10C.9-.9 .9-.9 10 0C.9 .9 .9 .9 0 10C-.9 .9 -.9 .9 -10 0C-.9-.9 -.9-.9 0-10Z';
  overlay.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">` +
    `<g transform="translate(118 78)"><path class="klej-twinkle" d="${glint}"/></g>` +
    `<g transform="translate(232 132)"><path class="klej-twinkle klej-twinkle--b" d="${glint}"/></g>` +
    `<g transform="translate(62 44)"><path class="klej-twinkle klej-twinkle--c" d="${glint}"/></g>` +
    `<g transform="translate(176 170)"><path class="klej-twinkle klej-twinkle--d" d="${glint}"/></g>` +
    '</svg>';
  const svg = overlay.content.firstElementChild;
  wrap.append(canvas);
  if (svg) wrap.append(svg);
  return wrap;
}
