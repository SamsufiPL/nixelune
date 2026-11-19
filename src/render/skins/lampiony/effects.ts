/**
 * Motion of `lampiony`. A path is lanterns being lit: flames catch one after another,
 * a thread of fire runs from cap to cap, then the lanterns lift off and dissolve into
 * embers that drift upwards. Landing throws a little gold dust; a hard drop sends a
 * ring over the lacquer. Everything here is data for the shared effect engine, plus
 * the sprite painters of the skin's own particles.
 */
import type { TileColor } from '../../../game/types';
import type { BurstSpec, Ctx2D, EffectsSkin, ParticleShape } from '../../skin';
import { FLAME, GLASS } from './palette';

export const DISPLAY_FONT = '"Fraunces Variable", Fraunces, Georgia, serif';

const UP: readonly [number, number] = [-Math.PI * 0.86, -Math.PI * 0.14];

function emberColors(color: TileColor): readonly string[] {
  return [GLASS[color].light, GLASS[color].lit, FLAME.yellow, FLAME.heart, FLAME.orange];
}
const PARTICLE_COLORS: Readonly<Record<TileColor, readonly string[]>> = {
  teal: emberColors('teal'),
  coral: emberColors('coral'),
  ice: emberColors('ice'),
  lilac: emberColors('lilac'),
  amber: emberColors('amber'),
};
/** No tile: the chain banner and the stage flourish burn in gold and vermilion. */
const FESTIVAL: readonly string[] = [FLAME.heart, FLAME.yellow, '#FFC860', FLAME.orange, '#FF7A4A'];

/** Gold dust thrown up where a lantern is set down. */
const DUST: BurstSpec = {
  count: 4,
  shape: 'ember',
  size: [0.1, 0.2],
  speed: [1.4, 3.4],
  angle: [Math.PI * 1.08, Math.PI * 1.92],
  life: [260, 440],
  gravity: 7,
  drag: 3.2,
  additive: true,
};
/** Sparks as a flame catches. */
const CATCH: BurstSpec = {
  count: 3,
  shape: 'spark',
  size: [0.26, 0.52],
  speed: [0.8, 3],
  life: [280, 520],
  spin: [-3, 3],
  drag: 2,
  additive: true,
};
/** The bloom of light around a lantern at the moment it lights. */
const BLOOM: BurstSpec = { count: 1, shape: 'glow', size: [3.4, 3.4], speed: [0, 0], life: [420, 420], additive: true };
/** Embers that rise from a lantern as it dissolves. */
const EMBERS: BurstSpec = {
  count: 8,
  shape: 'ember',
  size: [0.14, 0.36],
  speed: [0.5, 2.8],
  angle: UP,
  life: [620, 900],
  gravity: -5.5,
  drag: 1.1,
  spread: 0.55,
  additive: true,
};
/** Quick sparks thrown outwards as it goes. */
const CRACKLE: BurstSpec = {
  count: 4,
  shape: 'spark',
  size: [0.2, 0.44],
  speed: [2.2, 6.5],
  life: [300, 540],
  gravity: 3,
  drag: 2.4,
  spin: [-5, 5],
  additive: true,
};
/** A ring that runs over the lacquer under a hard drop. */
const RIPPLE: BurstSpec = { count: 1, shape: 'ring', size: [2.7, 2.7], speed: [0, 0], life: [360, 360], shrink: false, additive: true };
/** Fire-flowers behind the chain banner. */
const FIREWORK: BurstSpec = {
  count: 20,
  shape: 'spark',
  size: [0.28, 0.6],
  speed: [3.5, 10],
  life: [520, 900],
  gravity: 6,
  drag: 1.8,
  spin: [-4, 4],
  additive: true,
};
/** Stage complete: sheaves of embers going up all over the raft. */
const SHEAF: BurstSpec = {
  count: 16,
  shape: 'ember',
  size: [0.16, 0.42],
  speed: [1, 6],
  angle: UP,
  life: [650, 900],
  gravity: -3.5,
  drag: 1.3,
  spread: 0.8,
  additive: true,
};

/** Custom particle sprites; other shapes fall back to the engine's. */
function paintParticle(ctx: Ctx2D, shape: ParticleShape, color: string, size: number): boolean {
  const c = size / 2;
  switch (shape) {
    case 'ember': {
      // A hot point in a soft coloured glow.
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(0.2, color);
      g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 1;
      return true;
    }
    case 'glow': {
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, 'rgba(255,236,190,0.55)');
      g.addColorStop(0.35, 'rgba(255,190,110,0.26)');
      g.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      return true;
    }
    case 'ring': {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = size * 0.05;
      ctx.beginPath();
      ctx.arc(c, c, c - size * 0.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = size * 0.035;
      ctx.beginPath();
      ctx.arc(c, c, c * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return true;
    }
    case 'spark': {
      // A four-rayed glint with a white heart.
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(0.35, color);
      g.addColorStop(1, color);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(c, 0);
      ctx.quadraticCurveTo(c * 1.08, c * 0.92, size, c);
      ctx.quadraticCurveTo(c * 1.08, c * 1.08, c, size);
      ctx.quadraticCurveTo(c * 0.92, c * 1.08, 0, c);
      ctx.quadraticCurveTo(c * 0.92, c * 0.92, c, 0);
      ctx.fill();
      return true;
    }
    default:
      return false;
  }
}

/** The thread of fire along one link: orange body, gold middle, white heart, a bead at the tip. */
function paintEnergy(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, progress: number, r: number): void {
  const alpha = ctx.globalAlpha;
  const tx = ax + (bx - ax) * progress;
  const ty = ay + (by - ay) * progress;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(tx, ty);
  ctx.globalAlpha = alpha * 0.4;
  ctx.strokeStyle = '#FF7A2E';
  ctx.lineWidth = r * 0.42;
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = '#FFC860';
  ctx.lineWidth = r * 0.2;
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FFFBEA';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  if (progress < 1) {
    ctx.fillStyle = '#FFFBEA';
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
}

const ACTIVATION_MS = 250;
const LIGHT_UP_MS = 96;

export const EFFECTS: EffectsSkin = {
  timing: {
    step: 70,
    spawn: 140,
    hardDrop: 70,
    fallBase: 150,
    fallPerRow: 34,
    fallMax: 260,
    lightUp: LIGHT_UP_MS,
    activation: ACTIVATION_MS,
    pop: 390,
    popStagger: 180,
  },
  land: { squash: 0.2, ms: 300, dust: DUST },
  fall: { bounce: 0.13, ms: 250 },
  light: { pulse: 0.15, burst: CATCH, energy: { color: '#FFC860', width: 0.2, alpha: 1 } },
  pop: { scale: 1.24, burst: EMBERS },
  scorePop: { family: DISPLAY_FONT, weight: 700, size: 1.12, fill: '#FFF1CC', stroke: '#2E0C10', strokeWidth: 0.2, ms: 900, rise: 2.5 },
  chainBanner: {
    family: DISPLAY_FONT,
    weight: 800,
    size: 3.1,
    fill: '#FFD27A',
    stroke: '#2E0C10',
    strokeWidth: 0.13,
    ms: 1000,
    minChain: 2,
    burst: FIREWORK,
  },
  stageFlourish: { burst: SHEAF, bursts: 10, ms: 600 },
  particleColors: (tile) => (tile ? PARTICLE_COLORS[tile] : FESTIVAL),
  paintParticle,
  paintEnergy,
  onEvent(event, fx, board) {
    if (fx.reducedMotion) return;
    if (event.type === 'activated') {
      // A bloom of light at every lantern, in step with its flame.
      for (const group of event.groups) {
        const n = group.cells.length;
        for (let i = 0; i < n; i++) {
          const cell = group.cells[i];
          if (!cell) continue;
          const delay = n > 1 ? (i / (n - 1)) * (ACTIVATION_MS - LIGHT_UP_MS) : 0;
          fx.burst(BLOOM, board.cellX(cell.col, cell.row), board.cellY(cell.row), group.color, delay + LIGHT_UP_MS * 0.4);
        }
      }
    } else if (event.type === 'removed') {
      const n = event.cells.length;
      for (let i = 0; i < n; i++) {
        const cell = event.cells[i];
        if (!cell) continue;
        const delay = n > 1 ? (i / (n - 1)) * 180 : 0;
        fx.burst(CRACKLE, board.cellX(cell.col, cell.row), board.cellY(cell.row), cell.color, delay + 90);
      }
    } else if (event.type === 'locked' && event.hard && event.rowsDropped > 0) {
      // The lowest lantern of the piece rings the tray.
      let low = event.cells[0];
      for (const cell of event.cells) if (low && cell.row > low.row) low = cell;
      if (low) fx.burst(RIPPLE, board.cellX(low.col, low.row), board.cellY(low.row) + board.r * 0.3, low.color, 70);
    }
  },
};
