import { describe, expect, it } from 'vitest';
import type { GameView } from '../../src/game/types';
import { DEFAULT_SETTINGS, type SaveData } from '../../src/platform/types';
import { createI18n } from '../../src/services/i18n';
import { Announcer, ANNOUNCE_GAP_MS, describeBoard } from '../../src/ui/a11y';
import { starField } from '../../src/ui/backdrop';
import { chainText, formatCount, goalProgressText, goalText, pad2, pointsText, splitTitle } from '../../src/ui/format';
import { FALLBACK_LICENCES, loadLicences, parseLicences } from '../../src/ui/licences';
import { resolvePrefs } from '../../src/ui/prefs';
import { applyResult } from '../../src/ui/progress';
import { freshSeed, Session } from '../../src/ui/session';

const i18n = (language: 'pl' | 'en') => {
  const engine = createI18n({ systemLanguages: () => [language], log: () => undefined });
  engine.setLanguage(language);
  return engine;
};
const nbsp = (text: string) => text.replace(/[  ]/g, ' ');

describe('numbers', () => {
  it('pads counters to two digits', () => {
    expect(pad2(4)).toBe('04');
    expect(pad2(12)).toBe('12');
    expect(pad2(123)).toBe('123');
    expect(pad2(-3)).toBe('00');
    expect(chainText(6)).toBe('×06');
  });

  it('groups thousands from four digits up, as the kit writes them', () => {
    expect(nbsp(formatCount(i18n('pl'), 2400))).toBe('2 400');
    expect(nbsp(formatCount(i18n('pl'), 28460))).toBe('28 460');
    expect(formatCount(i18n('en'), 2400)).toBe('2,400');
    expect(formatCount(i18n('pl'), 0)).toBe('0');
  });

  it('writes the reward exactly as the microcopy', () => {
    expect(nbsp(pointsText(i18n('pl'), 'stage.bonus', 2400))).toBe('+2 400 punktów');
    expect(pointsText(i18n('pl'), 'stage.bonus', 1)).toBe('+1 punkt');
    expect(pointsText(i18n('pl'), 'stage.bonus', 3)).toBe('+3 punkty');
    expect(pointsText(i18n('en'), 'stage.bonus', 1)).toBe('+1 point');
    expect(pointsText(i18n('en'), 'stage.bonus', 2400)).toBe('+2,400 points');
  });
});

describe('goal text', () => {
  it('uses Polish plural forms', () => {
    const pl = i18n('pl');
    expect(goalText(pl, { kind: 'paths', target: 1 })).toBe('Połącz 1 świetlną ścieżkę');
    expect(goalText(pl, { kind: 'paths', target: 3 })).toBe('Połącz 3 świetlne ścieżki');
    expect(goalText(pl, { kind: 'paths', target: 8 })).toBe('Połącz 8 świetlnych ścieżek');
    expect(goalText(pl, { kind: 'paths', target: 22 })).toBe('Połącz 22 świetlne ścieżki');
    expect(goalText(pl, { kind: 'tiles', target: 12 })).toBe('Usuń 12 pól');
    expect(goalText(pl, { kind: 'chain', target: 3 })).toBe('Utwórz łańcuch ×3');
    expect(nbsp(goalText(pl, { kind: 'score', target: 5000 }))).toBe('Zdobądź 5 000 punktów');
  });

  it('reads naturally in English', () => {
    const en = i18n('en');
    expect(goalText(en, { kind: 'paths', target: 1 })).toBe('Light 1 path');
    expect(goalText(en, { kind: 'paths', target: 3 })).toBe('Light 3 paths');
  });

  it('never shows progress above the target', () => {
    expect(goalProgressText(i18n('pl'), { kind: 'paths', target: 3, progress: 5 })).toBe('3 / 3');
    expect(goalProgressText(i18n('pl'), { kind: 'paths', target: 3, progress: 2 })).toBe('2 / 3');
  });
});

describe('titles', () => {
  it('splits the two-tone heading at the first space', () => {
    expect(splitTitle('Ścieżka domknięta')).toEqual(['Ścieżka', 'domknięta']);
    expect(splitTitle('Pauza')).toEqual(['Pauza', '']);
  });
});

describe('announcer', () => {
  it('drops routine messages that come too soon, never important ones', () => {
    let now = 0;
    const region = { textContent: '' as string | null };
    const announcer = new Announcer(region, () => now);
    expect(announcer.announce('a')).toBe(true);
    now += 500;
    expect(announcer.announce('b')).toBe(false);
    expect(region.textContent?.trim()).toBe('a');
    expect(announcer.announce('over', true)).toBe(true);
    now += ANNOUNCE_GAP_MS;
    expect(announcer.announce('c')).toBe(true);
  });

  it('makes a repeated message a new string', () => {
    const region = { textContent: '' as string | null };
    const announcer = new Announcer(region, () => 0);
    announcer.announce('same', true);
    const first = region.textContent;
    announcer.announce('same', true);
    expect(region.textContent).not.toBe(first);
  });
});

describe('board description', () => {
  const view = {
    cols: 3,
    rows: 3,
    cells: [null, null, null, null, 'teal', null, 'coral', 'coral', null],
    phase: 'falling',
    outcome: null,
    mode: { kind: 'endless' },
    active: [
      { col: 1, row: 0, color: 'ice' },
      { col: 2, row: 0, color: 'ice' },
    ],
    ghost: null,
    next: { shapeId: 'x', cells: [{ q: 0, r: 0, color: 'amber' }] },
    held: null,
    canSwap: true,
    score: 2400,
    stage: 2,
    chain: 0,
    goal: { kind: 'paths', target: 3, progress: 1 },
    piecesLeft: null,
    groups: [],
    activating: [],
    dropIntervalMs: 800,
  } as unknown as GameView;

  it('summarises score, goal, stack, falling piece, next and held', () => {
    const text = nbsp(describeBoard(view, i18n('pl')));
    expect(text).toContain('Wynik 2 400');
    expect(text).toContain('Połącz 3 świetlne ścieżki, 1 / 3');
    expect(text).toContain('3 pola');
    expect(text).toContain('wierszu 2 z 3');
    expect(text).toContain('lodowy');
    expect(text).toContain('kolumny od 2 do 3');
    expect(text).toContain('Następny: bursztynowy');
    expect(text).toContain('Nic nie zachowano');
  });

  it('says so when the board is empty', () => {
    expect(describeBoard({ ...view, cells: view.cells.map(() => null), active: null }, i18n('en'))).toContain('The board is empty.');
  });
});

describe('preferences', () => {
  it('follows the system unless the player decided', () => {
    const system = { reducedMotion: true, moreContrast: false };
    expect(resolvePrefs({ ...DEFAULT_SETTINGS }, system).reducedMotion).toBe(true);
    expect(resolvePrefs({ ...DEFAULT_SETTINGS, reducedMotion: 'off' }, system).reducedMotion).toBe(false);
    expect(resolvePrefs({ ...DEFAULT_SETTINGS, reducedMotion: 'on' }, { reducedMotion: false, moreContrast: false }).reducedMotion).toBe(true);
  });

  it('system contrast is the default; the setting can add it', () => {
    expect(resolvePrefs({ ...DEFAULT_SETTINGS }, { reducedMotion: false, moreContrast: true }).highContrast).toBe(true);
    expect(resolvePrefs({ ...DEFAULT_SETTINGS, highContrast: true }, { reducedMotion: false, moreContrast: false }).highContrast).toBe(true);
    expect(resolvePrefs({ ...DEFAULT_SETTINGS }, { reducedMotion: false, moreContrast: false })).toEqual({
      reducedMotion: false,
      highContrast: false,
      marks: true,
    });
  });
});

describe('recording results', () => {
  const blank = (): SaveData => ({
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    bestScore: 1000,
    bestStage: 2,
    challenges: {},
    tutorialSeen: false,
    gamesPlayed: 4,
  });
  const challenge = { id: 'c1', seed: 1, prefill: [], goal: { kind: 'paths' as const, target: 1 }, pieceLimit: 5, colors: ['teal' as const] };

  it('keeps the best endless score and stage and counts the game once', () => {
    const save = blank();
    applyResult(save, { mode: { kind: 'endless' }, score: 2500, stage: 3, outcome: null, countGame: false });
    expect(save).toMatchObject({ bestScore: 2500, bestStage: 3, gamesPlayed: 4 });
    applyResult(save, { mode: { kind: 'endless' }, score: 900, stage: 1, outcome: 'blocked', countGame: true });
    expect(save).toMatchObject({ bestScore: 2500, bestStage: 3, gamesPlayed: 5 });
  });

  it('marks a challenge complete only when won, and never un-completes it', () => {
    const save = blank();
    const mode = { kind: 'challenge' as const, challenge };
    applyResult(save, { mode, score: 700, stage: 1, outcome: 'challengeFailed', countGame: true });
    expect(save.challenges.c1).toBeUndefined();
    applyResult(save, { mode, score: 700, stage: 1, outcome: 'challengeWon', countGame: true });
    expect(save.challenges.c1).toEqual({ completed: true, bestScore: 700 });
    applyResult(save, { mode, score: 300, stage: 1, outcome: 'challengeFailed', countGame: true });
    applyResult(save, { mode, score: 400, stage: 1, outcome: 'challengeWon', countGame: true });
    expect(save.challenges.c1).toEqual({ completed: true, bestScore: 700 });
    expect(save.bestScore).toBe(1000); // challenge scores do not touch the endless record
  });
});

describe('session', () => {
  it('uses the challenge seed for challenges and a fresh one for endless', () => {
    const configs: { seed: number }[] = [];
    const fake = (config: { seed: number }) => {
      configs.push(config);
      return { view: {} as GameView, apply() {}, tick() {}, drainEvents: () => [] };
    };
    const session = new Session(fake, { ...{ id: 'c', seed: 77, prefill: [], goal: { kind: 'paths', target: 1 }, pieceLimit: 3, colors: ['teal'] } }, 0);
    expect(configs[0]?.seed).toBe(77);
    session.counted = true;
    session.stageBonus = 5;
    session.restart(900);
    expect(configs[1]?.seed).toBe(77);
    expect(session.counted).toBe(false);
    expect(session.stageBonus).toBe(0);
    expect(session.bestBefore).toBe(900);
    expect(Number.isInteger(freshSeed(1_700_000_000_123))).toBe(true);
    expect(freshSeed(1)).not.toBe(freshSeed(2));
  });
});

describe('licences', () => {
  it('reads a Markdown table by its header', () => {
    const md = [
      '# Licences',
      '',
      '| Package | Version | Licence | Use |',
      '|---|---|---|---|',
      '| [@capacitor/core](https://x) | 8.6.2 | MIT | runtime |',
      '| `vite` | 8.3.8 | MIT | build |',
      '',
      'Some text after.',
    ].join('\n');
    expect(parseLicences(md)).toEqual([
      { name: '@capacitor/core', version: '8.6.2', licence: 'MIT' },
      { name: 'vite', version: '8.3.8', licence: 'MIT' },
    ]);
  });

  it('falls back to the built-in list', () => {
    expect(loadLicences({})).toBe(FALLBACK_LICENCES);
    expect(loadLicences({ a: 'no table here' })).toBe(FALLBACK_LICENCES);
  });
});

describe('star field', () => {
  it('is sparse, faint and the same every time', () => {
    const stars = starField(46);
    expect(stars).toEqual(starField(46));
    for (const star of stars) {
      expect(star.opacity).toBeLessThanOrEqual(0.35);
      expect(star.r).toBeLessThanOrEqual(1.6);
    }
  });
});
