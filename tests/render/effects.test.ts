import { describe, expect, it } from 'vitest';
import { TILE_COLORS } from '../../src/game/types';
import { cappedDpr, lightDelay, LINK_MIN_GROUP, MAX_DPR, TIMING } from '../../src/render/boardRenderer';
import { clamp01, easeInOutQuad, easeInQuad, easeOutCubic, progress } from '../../src/render/easing';
import { previewKey } from '../../src/render/preview';
import { MARK_SHAPE } from '../../src/render/tile';

describe('timing', () => {
  it('keeps the activation inside the art direction window of 200-260 ms', () => {
    expect(TIMING.activation).toBeGreaterThanOrEqual(200);
    expect(TIMING.activation).toBeLessThanOrEqual(260);
  });

  it('keeps the piece step at or under 80 ms and every motion under 260 ms', () => {
    expect(TIMING.step).toBeLessThanOrEqual(80);
    expect(TIMING.hardDrop).toBeLessThanOrEqual(80);
    expect(TIMING.settleMax).toBeLessThanOrEqual(260);
    expect(TIMING.disperse + TIMING.disperseStagger).toBeLessThanOrEqual(260);
  });

  it('lights tiles in order and finishes the last one at the activation time', () => {
    const n = 7;
    let last = -1;
    for (let i = 0; i < n; i++) {
      const delay = lightDelay(i, n);
      expect(delay).toBeGreaterThan(last);
      last = delay;
    }
    expect(lightDelay(0, n)).toBe(0);
    expect(lightDelay(n - 1, n) + TIMING.lightUp).toBe(TIMING.activation);
    expect(lightDelay(0, 1)).toBe(0);
  });

  it('shows forming links from three tiles up', () => {
    expect(LINK_MIN_GROUP).toBe(3);
  });
});

describe('device pixel ratio', () => {
  it('is capped and never below one', () => {
    expect(cappedDpr(1)).toBe(1);
    expect(cappedDpr(2)).toBe(2);
    expect(cappedDpr(4)).toBe(MAX_DPR);
    expect(cappedDpr(0.5)).toBe(1);
    expect(cappedDpr(NaN)).toBe(1);
  });
});

describe('easing', () => {
  it('starts at 0, ends at 1 and clamps', () => {
    for (const ease of [easeOutCubic, easeInQuad, easeInOutQuad]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      expect(ease(-1)).toBe(0);
      expect(ease(2)).toBe(1);
    }
    expect(clamp01(0.3)).toBe(0.3);
  });

  it('a zero duration is complete at once (reduced motion)', () => {
    expect(progress(100, 100, 0)).toBe(1);
    expect(progress(99, 100, 0)).toBe(0);
    expect(progress(150, 100, 100)).toBe(0.5);
  });
});

describe('tile marks', () => {
  it('gives every colour a different mark', () => {
    const shapes = TILE_COLORS.map((color) => MARK_SHAPE[color]);
    expect(new Set(shapes).size).toBe(TILE_COLORS.length);
  });
});

describe('preview key', () => {
  it('changes with shape, colour and dimming only', () => {
    const piece = { shapeId: 'a', cells: [{ q: 0, r: 0, color: 'teal' as const }] };
    expect(previewKey(piece, false)).toBe(previewKey({ ...piece }, false));
    expect(previewKey(piece, true)).not.toBe(previewKey(piece, false));
    expect(previewKey({ ...piece, cells: [{ q: 0, r: 0, color: 'coral' }] }, false)).not.toBe(previewKey(piece, false));
    expect(previewKey(null, false)).toBe('none');
  });
});
