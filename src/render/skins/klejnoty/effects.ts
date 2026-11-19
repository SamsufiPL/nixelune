/**
 * Motion of the jewel skin. A path is light travelling THROUGH the stones: each one
 * flares from within as the beam reaches it, a warm caustic beam joins them, then
 * they shatter into spinning shards and glints. Stones are hard, so landings are a
 * small crisp squash with a sparkle, not a wobble.
 */
import type { TileColor } from '../../../game/types';
import type { BurstSpec, Ctx2D, EffectsSkin, ParticleShape } from '../../skin';
import { GEMS, GOLD, GOLD_PALE, IVORY, rgb } from './palette';
import { paintGlint } from './tile';

const FONT = '"Cinzel Variable", Cinzel, "Times New Roman", serif';

const PARTICLE_COLORS: Readonly<Record<TileColor, readonly string[]>> = {
  teal: [GEMS.teal.light, GEMS.teal.base, GEMS.teal.pale, GEMS.teal.glow],
  coral: [GEMS.coral.light, GEMS.coral.base, GEMS.coral.pale, GEMS.coral.glow],
  ice: [GEMS.ice.light, GEMS.ice.base, GEMS.ice.pale, GEMS.ice.glow],
  lilac: [GEMS.lilac.light, GEMS.lilac.base, GEMS.lilac.pale, GEMS.lilac.glow],
  amber: [GEMS.amber.light, GEMS.amber.base, GEMS.amber.pale, GEMS.amber.glow],
};
/** No tile: gold dust and one shard of every stone. */
const TREASURE: readonly string[] = [GOLD_PALE, GOLD, IVORY, GEMS.teal.light, GEMS.coral.light, GEMS.ice.light, GEMS.lilac.light, GEMS.amber.light];

const UP: readonly [number, number] = [Math.PI * 1.08, Math.PI * 1.92];

/** Pile dust and a fleck of light when stones touch down. */
const DUST: BurstSpec = { count: 4, shape: 'mote', size: [0.1, 0.2], speed: [1, 3], angle: UP, life: [240, 420], gravity: 4, drag: 3.2, spread: 0.4 };
const LAND_GLINT: BurstSpec = { count: 1, shape: 'glint', size: [0.5, 0.75], speed: [0, 0.3], life: [200, 300], additive: true, spin: [-2, 2] };
const HARD_PUFF: BurstSpec = { count: 7, shape: 'mote', size: [0.1, 0.22], speed: [2, 5.5], angle: UP, life: [260, 460], gravity: 6, drag: 3.4, spread: 0.5 };

/** Glints thrown as a stone lights from within, and the bloom of the flare itself. */
const FLARE_GLINTS: BurstSpec = { count: 3, shape: 'glint', size: [0.34, 0.7], speed: [0.6, 2.6], life: [240, 460], spin: [-5, 5], additive: true, spread: 0.3 };
const BLOOM: BurstSpec = { count: 1, shape: 'bloom', size: [3, 3.4], speed: [0, 0], life: [300, 340], additive: true };

/** The break: faceted shards with weight, and sparks of light among them. */
const SHATTER: BurstSpec = { count: 8, shape: 'shard', size: [0.22, 0.5], speed: [3.5, 10], life: [440, 720], gravity: 22, drag: 1.3, spin: [-13, 13], spread: 0.3 };
const SHATTER_GLINTS: BurstSpec = { count: 2, shape: 'glint', size: [0.3, 0.6], speed: [2, 6], life: [300, 520], drag: 2.4, spin: [-6, 6], additive: true, spread: 0.3 };

const BANNER_RAYS: BurstSpec = { count: 14, shape: 'glint', size: [0.5, 1.1], speed: [3, 9], life: [500, 850], drag: 2.2, spin: [-4, 4], additive: true, spread: 1.2 };
const SHOWER: BurstSpec = { count: 16, shape: 'shard', size: [0.26, 0.56], speed: [4, 12], life: [650, 900], gravity: 13, drag: 1, spin: [-9, 9], spread: 0.4 };
const SHOWER_GLINTS: BurstSpec = { count: 5, shape: 'glint', size: [0.5, 1], speed: [1, 5], life: [420, 760], drag: 2, spin: [-4, 4], additive: true, spread: 1 };

function tint(color: string): string {
  const c = rgb(color);
  return `${c[0]},${c[1]},${c[2]}`;
}

function paintParticle(ctx: Ctx2D, shape: ParticleShape, color: string, size: number): boolean {
  const c = size / 2;
  switch (shape) {
    case 'shard': {
      // A splinter of cut stone: a lit facet, a shaded facet, one bright edge.
      const ax = size * 0.5;
      const ay = size * 0.03;
      const bx = size * 0.9;
      const by = size * 0.66;
      const dx = size * 0.24;
      const dy = size * 0.97;
      const mx = size * 0.52;
      const my = size * 0.58;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(mx, my);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(20,0,10,0.3)';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(mx, my);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(1, size * 0.05);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      return true;
    }
    case 'glint':
      paintGlint(ctx, c, c, c * 0.98, 1, tint(color));
      return true;
    case 'bloom': {
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.25, `rgba(${tint(color)},0.5)`);
      g.addColorStop(1, `rgba(${tint(color)},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      return true;
    }
    case 'mote': {
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, 'rgba(255,236,200,0.9)');
      g.addColorStop(0.5, 'rgba(255,200,150,0.35)');
      g.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      return true;
    }
    default:
      return false;
  }
}

/** The caustic beam between two stones: a warm sheath, a hot core and a bright head. */
function paintEnergy(ctx: Ctx2D, ax: number, ay: number, bx: number, by: number, progress: number, r: number): void {
  const hx = ax + (bx - ax) * progress;
  const hy = ay + (by - ay) * progress;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(hx, hy);
  ctx.strokeStyle = 'rgba(255,226,160,0.26)';
  ctx.lineWidth = r * 0.56;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,244,214,0.5)';
  ctx.lineWidth = r * 0.24;
  ctx.stroke();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.stroke();
  if (progress < 1) {
    const s = r * 0.34;
    const w = s * 0.2;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(hx, hy - s);
    ctx.lineTo(hx + w, hy - w);
    ctx.lineTo(hx + s, hy);
    ctx.lineTo(hx + w, hy + w);
    ctx.lineTo(hx, hy + s);
    ctx.lineTo(hx - w, hy + w);
    ctx.lineTo(hx - s, hy);
    ctx.lineTo(hx - w, hy - w);
    ctx.closePath();
    ctx.fill();
  }
}

const ACTIVATION = 250;
const LIGHT_UP = 110;

export const effects: EffectsSkin = {
  timing: {
    step: 70,
    spawn: 140,
    hardDrop: 70,
    fallBase: 150,
    fallPerRow: 28,
    fallMax: 260,
    lightUp: LIGHT_UP,
    activation: ACTIVATION,
    pop: 300,
    popStagger: 150,
  },
  land: { squash: 0.15, ms: 300, dust: DUST },
  fall: { bounce: 0.13, ms: 250 },
  light: { pulse: 0.2, burst: FLARE_GLINTS, energy: { color: '#FFF4D6', width: 0.2, alpha: 1 } },
  pop: { scale: 1.24, burst: SHATTER },
  scorePop: { family: FONT, weight: 700, size: 1.25, fill: '#FFF3D2', stroke: '#2A0E08', strokeWidth: 0.17, ms: 900, rise: 2.4 },
  chainBanner: { family: FONT, weight: 800, size: 3.1, fill: '#FFDD8F', stroke: '#2A0E08', strokeWidth: 0.1, ms: 1000, minChain: 2, burst: BANNER_RAYS },
  stageFlourish: { burst: SHOWER, bursts: 8, ms: 700 },
  particleColors: (tile) => (tile ? PARTICLE_COLORS[tile] : TREASURE),
  paintParticle,
  paintEnergy,
  onEvent(event, fx, board) {
    if (fx.reducedMotion) return;
    switch (event.type) {
      case 'locked': {
        // A fleck of lamplight off each stone as it settles; a puff of pile on a hard drop.
        const delay = event.hard ? 70 : 0;
        for (let i = 0; i < event.cells.length; i++) {
          const cell = event.cells[i];
          if (!cell) continue;
          const x = board.cellX(cell.col, cell.row);
          const y = board.cellY(cell.row);
          fx.burst(LAND_GLINT, x - board.r * 0.3, y - board.r * 0.4, cell.color, delay + 60 + i * 40);
          if (event.hard) fx.burst(HARD_PUFF, x, y + board.r * 0.7, null, delay);
        }
        break;
      }
      case 'activated': {
        // The flare blooms in each stone at the moment the beam reaches it.
        for (const group of event.groups) {
          const n = group.cells.length;
          for (let i = 0; i < n; i++) {
            const cell = group.cells[i];
            if (!cell) continue;
            const delay = n > 1 ? (i / (n - 1)) * (ACTIVATION - LIGHT_UP) : 0;
            fx.burst(BLOOM, board.cellX(cell.col, cell.row), board.cellY(cell.row), group.color, delay);
          }
        }
        break;
      }
      case 'removed': {
        if (event.cells.length > 14) break;
        for (let i = 0; i < event.cells.length; i++) {
          const cell = event.cells[i];
          if (cell) fx.burst(SHATTER_GLINTS, board.cellX(cell.col, cell.row), board.cellY(cell.row), cell.color, i * 14);
        }
        break;
      }
      case 'stageCompleted': {
        for (let i = 0; i < 4; i++) {
          fx.burst(SHOWER_GLINTS, board.width * (0.2 + fx.random() * 0.6), board.height * (0.2 + fx.random() * 0.5), null, i * 150);
        }
        break;
      }
      default:
        break;
    }
  },
};
