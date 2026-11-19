/**
 * Motion of the Glasshouse skin. A path of light is sunlight: a beam runs along the
 * tiles, each glaze flares as it passes, then the tiles burst into what their relief
 * shows - leaves, petals, drops of water, blossom, pollen. Everything here is data
 * for the shared effect engine plus sprite painters that run once per shape.
 */
import type { TileColor } from '../../../game/types';
import {
  resolveTiming,
  type BoardInfo,
  type BurstSpec,
  type Ctx2D,
  type EffectsSkin,
  type FxApi,
  type ParticleShape,
} from '../../skin';
import type { GameEvent } from '../../../game/types';
import { GLAZES, mix } from './palette';

const DISPLAY = '"Fraunces Variable", "Iowan Old Style", Georgia, serif';

const TIMING: EffectsSkin['timing'] = {
  step: 70,
  spawn: 140,
  hardDrop: 70,
  fallBase: 150,
  fallPerRow: 28,
  fallMax: 260,
  lightUp: 110,
  activation: 250,
  pop: 300,
  popStagger: 140,
};
const RESOLVED = resolveTiming(TIMING);

const PARTICLE_COLORS: Readonly<Record<TileColor, readonly string[]>> = {
  teal: [GLAZES.teal.light, GLAZES.teal.base, mix(GLAZES.teal.base, GLAZES.teal.light, 0.5)],
  coral: [GLAZES.coral.light, GLAZES.coral.base, mix(GLAZES.coral.base, GLAZES.coral.light, 0.5)],
  ice: [GLAZES.ice.light, GLAZES.ice.base, mix(GLAZES.ice.base, GLAZES.ice.light, 0.5)],
  lilac: [GLAZES.lilac.light, GLAZES.lilac.base, mix(GLAZES.lilac.base, GLAZES.lilac.light, 0.5)],
  amber: [GLAZES.amber.light, GLAZES.amber.base, mix(GLAZES.amber.base, GLAZES.amber.light, 0.5)],
};
/** Mixed blossom for the chain banner and the stage flourish. */
const BLOSSOM: readonly string[] = [
  GLAZES.coral.base,
  GLAZES.coral.light,
  GLAZES.amber.base,
  GLAZES.lilac.base,
  GLAZES.lilac.light,
  '#FFF6E2',
];

/** Stone dust kicked up where a piece lands. */
const DUST: BurstSpec = {
  count: 4,
  shape: 'dust',
  size: [0.3, 0.55],
  speed: [1.2, 3.2],
  angle: [Math.PI * 1.02, Math.PI * 1.98],
  life: [240, 420],
  gravity: 3,
  drag: 4,
  spread: 0.35,
  shrink: false,
};
const DUST_HARD: BurstSpec = { ...DUST, count: 5, size: [0.35, 0.7], speed: [2.2, 5], life: [300, 480] };

/**
 * Petals are thrown up and outwards, then the air takes them: strong drag, light
 * gravity, a slow turn. They stay full size and fade, as things that drift do.
 */
const PETALS: BurstSpec = {
  count: 8,
  shape: 'petal',
  size: [0.46, 0.8],
  speed: [5, 12],
  angle: [Math.PI * 0.9, Math.PI * 2.1],
  life: [620, 900],
  gravity: 9,
  drag: 3.2,
  spin: [-6, 6],
  spread: 0.35,
  shrink: false,
};
const BLOSSOMS: BurstSpec = { ...PETALS, shape: 'blossom', size: [0.38, 0.66], count: 9 };
const LEAFLETS: BurstSpec = { ...PETALS, shape: 'leaflet', size: [0.5, 0.86], spin: [-4, 4], gravity: 7 };
const DROPS: BurstSpec = {
  count: 9,
  shape: 'drop',
  size: [0.2, 0.46],
  speed: [5, 12],
  angle: [Math.PI * 1.08, Math.PI * 1.92],
  life: [460, 720],
  gravity: 26,
  drag: 0.6,
  spread: 0.3,
  shrink: false,
};
const POLLEN: BurstSpec = {
  count: 7,
  shape: 'pollen',
  size: [0.16, 0.3],
  speed: [2, 6.5],
  life: [460, 760],
  gravity: 3,
  drag: 2.6,
  spread: 0.35,
};
/** The burst that belongs to each relief. */
const SIGNATURE: Readonly<Record<TileColor, BurstSpec>> = {
  teal: LEAFLETS,
  coral: PETALS,
  ice: DROPS,
  lilac: BLOSSOMS,
  amber: { ...PETALS, count: 5 },
};

const FANFARE: BurstSpec = {
  count: 12,
  shape: 'petal',
  size: [0.4, 0.8],
  speed: [4, 12],
  angle: [Math.PI * 1.1, Math.PI * 1.9],
  life: [640, 900],
  gravity: 12,
  drag: 1.4,
  spin: [-6, 6],
  spread: 0.6,
};
const SHOWER: BurstSpec = {
  count: 14,
  shape: 'petal',
  size: [0.4, 0.75],
  speed: [2, 8],
  life: [660, 900],
  gravity: 9,
  drag: 1.6,
  spin: [-6, 6],
  spread: 0.8,
};
const LEAF_FALL: BurstSpec = {
  count: 10,
  shape: 'leaf',
  size: [0.5, 0.85],
  speed: [1.5, 6],
  angle: [Math.PI * 0.15, Math.PI * 0.85],
  life: [700, 900],
  gravity: 6,
  drag: 1.5,
  spin: [-4, 4],
  spread: 1.2,
};

const LEAF_GREENS = ['#3F9A62', '#2F7D52', '#6DB56F', '#8CC47A'] as const;

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function paintLeafShape(ctx: Ctx2D, c: number, size: number, fill: string, rib: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(c, size * 0.04);
  ctx.bezierCurveTo(size * 0.92, size * 0.3, size * 0.82, size * 0.74, c, size * 0.96);
  ctx.bezierCurveTo(size * 0.18, size * 0.74, size * 0.08, size * 0.3, c, size * 0.04);
  ctx.fill();
  // Light on the half towards the sun.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(c, 0, c, size);
  ctx.restore();
  ctx.strokeStyle = rib;
  ctx.lineWidth = size * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(c, size * 0.12);
  ctx.lineTo(c, size * 0.94);
  ctx.stroke();
}

function paintParticle(ctx: Ctx2D, shape: ParticleShape, color: string, size: number): boolean {
  const c = size / 2;
  switch (shape) {
    case 'petal':
    case 'blossom': {
      // A cupped petal: round at the top, drawn to a point, pale at the base.
      const narrow = shape === 'blossom' ? 0.62 : 0.84;
      const g = ctx.createLinearGradient(size * 0.75, size * 0.1, size * 0.3, size * 0.95);
      g.addColorStop(0, mix(color, '#FFFFFF', 0.55));
      g.addColorStop(0.5, color);
      g.addColorStop(1, mix(color, '#FFF3D6', 0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(c, size * 0.97);
      ctx.bezierCurveTo(c - size * 0.62 * narrow, size * 0.6, c - size * 0.42 * narrow, size * 0.02, c, size * 0.06);
      ctx.bezierCurveTo(c + size * 0.42 * narrow, size * 0.02, c + size * 0.62 * narrow, size * 0.6, c, size * 0.97);
      ctx.fill();
      ctx.strokeStyle = mix(color, '#5A2A2A', 0.3);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = size * 0.04;
      ctx.beginPath();
      ctx.moveTo(c, size * 0.9);
      ctx.quadraticCurveTo(c + size * 0.04, size * 0.5, c, size * 0.24);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return true;
    }
    case 'leaflet':
      paintLeafShape(ctx, c, size, color, mix(color, '#0E5744', 0.6));
      return true;
    case 'leaf': {
      const green = LEAF_GREENS[hash(color) % LEAF_GREENS.length] ?? LEAF_GREENS[0];
      paintLeafShape(ctx, c, size, green, '#1F5A41');
      return true;
    }
    case 'drop': {
      // A bead of water: clear, with the window in it and a dark foot.
      const g = ctx.createRadialGradient(c + size * 0.12, c - size * 0.14, size * 0.04, c, c, c * 0.92);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.35, mix(color, '#FFFFFF', 0.72));
      g.addColorStop(0.8, mix(color, '#DCEBFF', 0.45));
      g.addColorStop(1, mix(color, '#1E46A6', 0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, c * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.ellipse(c + size * 0.16, c - size * 0.2, size * 0.13, size * 0.08, -0.6, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }
    case 'pollen': {
      const g = ctx.createRadialGradient(c + size * 0.1, c - size * 0.1, 0, c, c, c);
      g.addColorStop(0, '#FFF8D2');
      g.addColorStop(0.6, '#F7C232');
      g.addColorStop(1, '#D08A12');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, c * 0.92, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }
    case 'dust': {
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, 'rgba(255,250,238,0.85)');
      g.addColorStop(0.6, 'rgba(226,212,186,0.4)');
      g.addColorStop(1, 'rgba(226,212,186,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      return true;
    }
    default:
      return false;
  }
}

function onEvent(event: GameEvent, fx: FxApi, board: BoardInfo): void {
  if (fx.reducedMotion) return;
  switch (event.type) {
    case 'locked': {
      if (!event.hard) return;
      // A dropped piece lands harder: more dust, pushed out sideways.
      for (const cell of event.cells) {
        fx.burst(DUST_HARD, board.cellX(cell.col, cell.row), board.cellY(cell.row) + board.r * 0.7, cell.color, 50);
      }
      return;
    }
    case 'removed': {
      const count = event.cells.length;
      for (let i = 0; i < count; i++) {
        const cell = event.cells[i];
        if (!cell) continue;
        const x = board.cellX(cell.col, cell.row);
        const y = board.cellY(cell.row);
        const delay = (count <= 1 ? 0 : (i / (count - 1)) * RESOLVED.popStagger) + RESOLVED.pop * 0.32;
        fx.burst(SIGNATURE[cell.color], x, y, cell.color, delay);
        if (cell.color === 'amber') fx.burst(POLLEN, x, y, cell.color, delay);
      }
      return;
    }
    case 'stageCompleted': {
      // Leaves let go from the baskets overhead.
      fx.burst(LEAF_FALL, board.width * 0.18, -board.r, null, 80);
      fx.burst(LEAF_FALL, board.width * 0.82, -board.r, null, 260);
      return;
    }
    default:
      return;
  }
}

/** The sunbeam running along a link: a gilt band, a white core, a bright head. */
function paintEnergy(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, progress: number, r: number): void {
  const hx = ax + (bx - ax) * progress;
  const hy = ay + (by - ay) * progress;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#FFD667';
  ctx.lineWidth = r * 0.34;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = '#FFFDF0';
  ctx.lineWidth = r * 0.15;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  if (progress < 1) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const EFFECTS: EffectsSkin = {
  timing: TIMING,
  land: { squash: 0.2, ms: 300, dust: DUST },
  fall: { bounce: 0.13, ms: 240 },
  light: { pulse: 0.15, burst: null, energy: { color: '#FFE9A8', width: 0.3, alpha: 0.92 } },
  // The tile's own swell; what it bursts into is thrown in `onEvent`, by relief.
  pop: { scale: 1.26, burst: null },
  scorePop: {
    family: DISPLAY,
    weight: 700,
    size: 1.2,
    fill: '#FFFDF2',
    stroke: '#17432F',
    strokeWidth: 0.2,
    ms: 720,
    rise: 2.4,
  },
  chainBanner: {
    family: DISPLAY,
    weight: 800,
    size: 3.3,
    fill: '#FFFDF2',
    stroke: '#17432F',
    strokeWidth: 0.13,
    ms: 950,
    minChain: 2,
    burst: FANFARE,
  },
  stageFlourish: { burst: SHOWER, bursts: 8, ms: 600 },
  particleColors: (tile) => (tile ? PARTICLE_COLORS[tile] : BLOSSOM),
  paintParticle,
  paintEnergy,
  onEvent,
};
