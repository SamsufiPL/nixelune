/**
 * ROUGH DEMO SKIN. Its only job is to prove the skin contract: sprite painting with
 * gradients and thickness, overflow and row order, hint states instead of links, a
 * canvas backdrop with an ambient layer, loud use of every effect hook, a theme with
 * chunky buttons. It is not a design proposal and will be deleted.
 */
import '../../../ui/themes/demo.css';
import type { TileColor } from '../../../game/types';
import { defineSkin, type BurstSpec, type Ctx2D } from '../../skin';
import { paintDemoSocket, paintDemoTile, TONES } from './tile';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

const PARTICLE_COLORS: Readonly<Record<TileColor, readonly string[]>> = {
  teal: [TONES.teal.light, TONES.teal.base, '#FFFFFF'],
  coral: [TONES.coral.light, TONES.coral.base, '#FFFFFF'],
  ice: [TONES.ice.light, TONES.ice.base, '#FFFFFF'],
  lilac: [TONES.lilac.light, TONES.lilac.base, '#FFFFFF'],
  amber: [TONES.amber.light, TONES.amber.base, '#FFFFFF'],
};
const CONFETTI: readonly string[] = ['#FFD166', '#FF5A6E', '#3FA8FF', '#9B6BFF', '#1FBFA5', '#FFFFFF'];

const DUST: BurstSpec = {
  count: 4,
  shape: 'dot',
  size: [0.1, 0.22],
  speed: [1.2, 3],
  angle: [Math.PI * 1.05, Math.PI * 1.95],
  life: [220, 380],
  gravity: 5,
  drag: 3,
};
const SPARKLE: BurstSpec = {
  count: 3,
  shape: 'spark',
  size: [0.3, 0.6],
  speed: [0.6, 2.4],
  life: [260, 460],
  spin: [-4, 4],
  additive: true,
};
const SHATTER: BurstSpec = {
  count: 9,
  shape: 'shard',
  size: [0.22, 0.5],
  speed: [3, 9],
  life: [380, 640],
  gravity: 16,
  drag: 1.2,
  spin: [-10, 10],
  spread: 0.3,
};
const FANFARE: BurstSpec = {
  count: 20,
  shape: 'star',
  size: [0.3, 0.7],
  speed: [4, 12],
  life: [600, 900],
  gravity: 9,
  drag: 1,
  spin: [-6, 6],
};
const RING: BurstSpec = { count: 1, shape: 'ring', size: [2.4, 2.4], speed: [0, 0], life: [320, 320], shrink: false, additive: true };

// Ambient motes: fixed positions and speeds, so the per-frame painter allocates nothing.
const MOTES = 22;
const moteX = new Float32Array(MOTES);
const moteY = new Float32Array(MOTES);
const moteSize = new Float32Array(MOTES);
const moteSpeed = new Float32Array(MOTES);
for (let i = 0; i < MOTES; i++) {
  // Golden-ratio scatter: even, deterministic, no random generator needed.
  moteX[i] = (i * 0.618034) % 1;
  moteY[i] = (i * 0.381966 + 0.13) % 1;
  moteSize[i] = 1.2 + ((i * 7) % 5) * 0.7;
  moteSpeed[i] = 0.006 + ((i * 3) % 7) * 0.002;
}

function paintBackdrop(ctx: Ctx2D, width: number, height: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#3A1D63');
  sky.addColorStop(0.55, '#221040');
  sky.addColorStop(1, '#120824');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  // Soft lights; kept towards the edges so the board area stays calm.
  const blobs: readonly (readonly [number, number, number, string])[] = [
    [0.08, 0.12, 0.5, 'rgba(255,120,160,0.28)'],
    [0.95, 0.3, 0.45, 'rgba(90,150,255,0.24)'],
    [0.15, 0.95, 0.55, 'rgba(255,180,60,0.18)'],
    [0.9, 0.92, 0.4, 'rgba(60,220,190,0.16)'],
  ];
  const unit = Math.max(width, height);
  for (const [fx, fy, fr, color] of blobs) {
    const x = fx * width;
    const y = fy * height;
    const rad = fr * unit;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

function paintAmbient(ctx: Ctx2D, width: number, height: number, time: number): void {
  ctx.fillStyle = 'rgba(255,240,210,0.5)';
  ctx.beginPath();
  for (let i = 0; i < MOTES; i++) {
    const t = time * 0.001 * (moteSpeed[i] ?? 0);
    const y = ((((moteY[i] ?? 0) - t) % 1) + 1) % 1;
    const x = (moteX[i] ?? 0) + Math.sin(time * 0.0004 + i) * 0.012;
    const size = moteSize[i] ?? 1;
    ctx.moveTo(x * width + size, y * height);
    ctx.arc(x * width, y * height, size, 0, Math.PI * 2);
  }
  ctx.fill();
}

export default defineSkin({
  id: 'demo',
  meta: {
    marks: {
      teal: { shape: 'disc', name: { pl: 'koło', en: 'disc' } },
      coral: { shape: 'triangle', name: { pl: 'trójkąt', en: 'triangle' } },
      ice: { shape: 'square', name: { pl: 'kwadrat', en: 'square' } },
      lilac: { shape: 'diamond', name: { pl: 'romb', en: 'diamond' } },
      amber: { shape: 'star', name: { pl: 'gwiazda', en: 'star' } },
    },
  },
  tile: {
    // Shadow and thickness reach below the cell; a little room at the sides for strokes.
    overflow: { x: 0.06, top: 0.04, bottom: 0.42 },
    rowOrder: 'topDown',
    paint: paintDemoTile,
  },
  bed: {
    pad: 0.8,
    paint(b) {
      for (let row = 0; row < b.rows; row++) {
        for (let col = 0; col < b.cols; col++) {
          paintDemoSocket(b.ctx, b.cellX(col, row), b.cellY(row), b.r, b.highContrast);
        }
      }
    },
  },
  links: null,
  backdrop: {
    kind: 'canvas',
    paint: paintBackdrop,
    ambient: { fps: 20, paint: paintAmbient },
  },
  effects: {
    timing: {
      step: 70,
      spawn: 120,
      hardDrop: 70,
      fallBase: 140,
      fallPerRow: 30,
      fallMax: 260,
      lightUp: 90,
      activation: 250,
      pop: 260,
      popStagger: 120,
    },
    land: { squash: 0.22, ms: 260, dust: DUST },
    fall: { bounce: 0.14, ms: 220 },
    light: { pulse: 0.16, burst: SPARKLE, energy: { color: '#FFFFFF', width: 0.2, alpha: 0.95 } },
    pop: { scale: 1.3, burst: SHATTER },
    scorePop: { family: FONT, weight: 800, size: 1.15, fill: '#FFFFFF', stroke: '#3A1D63', strokeWidth: 0.2, ms: 800, rise: 2.2 },
    chainBanner: {
      family: FONT,
      weight: 800,
      size: 3.2,
      fill: '#FFD166',
      stroke: '#3A1D63',
      strokeWidth: 0.14,
      ms: 900,
      minChain: 2,
      burst: FANFARE,
    },
    stageFlourish: { burst: FANFARE, bursts: 8, ms: 600 },
    particleColors: (tile) => (tile ? PARTICLE_COLORS[tile] : CONFETTI),
    onEvent(event, fx, board) {
      // Extra hook: a ring of light where a hard-dropped piece lands.
      if (event.type !== 'locked' || !event.hard) return;
      const cell = event.cells[0];
      if (cell) fx.burst(RING, board.cellX(cell.col, cell.row), board.cellY(cell.row), cell.color, 70);
    },
  },
  ui: {
    themeColor: '#221040',
    decorate(root, screen) {
      if (screen !== 'menu' || root.querySelector('.demo-ribbon')) return;
      const ribbon = document.createElement('div');
      ribbon.className = 'demo-ribbon';
      ribbon.setAttribute('aria-hidden', 'true');
      ribbon.textContent = 'DEMO';
      root.append(ribbon);
    },
    menuArt() {
      // The menu picture is painted with the tile painter itself.
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const size = 240;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const colors: readonly TileColor[] = ['teal', 'coral', 'ice', 'lilac', 'amber'];
        const r = 34;
        colors.forEach((color, i) => {
          const row = i < 2 ? 0 : i < 4 ? 1 : 2;
          const col = i < 2 ? i : i < 4 ? i - 2 : 0;
          const cx = 72 + col * r * 1.732 + (row % 2) * r * 0.866 - (row === 2 ? -r * 0.866 : 0);
          const cy = 62 + row * r * 1.5;
          paintDemoTile({ ctx, color, state: 'normal', cx, cy, r, marks: true, highContrast: false, dpr });
        });
      }
      return canvas;
    },
  },
});
