/**
 * Frame-time read-out for skin work, switched on with `?fps=1`. It samples the time
 * between animation frames and the time spent drawing the board, shows a rolling
 * summary and keeps the raw numbers on `window.__nxPerf` for scripted measurements.
 * Without the query parameter nothing is created.
 */
import { el } from './dom';

export interface PerfStats {
  /** Time between animation frames, ms. */
  frames: number[];
  /** Time spent in the board draw of frames that drew, ms. */
  draws: number[];
  maxParticles: number;
}

export interface PerfProbe {
  sample(drew: boolean, drawMs: number, particles: number): void;
  dispose(): void;
}

export function perfEnabled(search: string): boolean {
  try {
    const value = new URLSearchParams(search).get('fps');
    return value !== null && value !== '0';
  } catch {
    return false;
  }
}

/** Value below which `share` (0-1) of the samples fall. Sorts a copy. */
export function percentile(samples: readonly number[], share: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(share * sorted.length) - 1))] ?? 0;
}

const WINDOW = 90;

export function createPerfProbe(host: HTMLElement): PerfProbe | null {
  if (!perfEnabled(window.location.search)) return null;
  const stats: PerfStats = { frames: [], draws: [], maxParticles: 0 };
  (window as unknown as { __nxPerf?: PerfStats }).__nxPerf = stats;
  const node = el('div', { class: 'perf-probe', 'aria-hidden': 'true' });
  host.append(node);
  let last = -1;
  let count = 0;
  return {
    sample(drew, drawMs, particles) {
      const now = performance.now();
      if (last >= 0) stats.frames.push(now - last);
      last = now;
      if (drew) stats.draws.push(drawMs);
      if (particles > stats.maxParticles) stats.maxParticles = particles;
      if (++count % 30 !== 0) return;
      const frames = stats.frames.slice(-WINDOW);
      const draws = stats.draws.slice(-WINDOW);
      node.textContent =
        `frame p50 ${percentile(frames, 0.5).toFixed(1)} max ${Math.max(0, ...frames).toFixed(1)} ms · ` +
        `draw p50 ${percentile(draws, 0.5).toFixed(2)} max ${Math.max(0, ...draws).toFixed(2)} ms · ` +
        `particles ${particles}`;
    },
    dispose() {
      node.remove();
    },
  };
}
