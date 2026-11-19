/**
 * The game screen's DOM: stats, board frame, goal strip, queue and actions. One
 * structure serves every layout (see styles/game.css). `update` runs every frame and
 * writes to the DOM only when a shown value changed.
 */
import type { GameView } from '../../game/types';
import { PiecePreviewCanvas } from '../../render/preview';
import { boardAspect } from '../../render/hex';
import type { PreviewStyle } from '../../render/preview';
import { brand } from '../brand';
import type { AppContext } from '../context';
import { el, setText, svg, Texts } from '../dom';
import { chainText, formatCount, goalProgressText, goalText, pad2 } from '../format';
import { ICONS } from '../icons';

export interface Hud {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly frame: HTMLElement;
  readonly boardSlot: HTMLElement;
  readonly pause: HTMLButtonElement;
  readonly rotate: HTMLButtonElement;
  readonly drop: HTMLButtonElement;
  readonly swap: HTMLButtonElement;
  readonly describe: HTMLButtonElement;
  readonly fallback: HTMLElement;
  update(view: GameView): void;
  /** Language changed: rebuild every text, including cached values. */
  relabel(view: GameView): void;
  /** Tile style changed: previews must be redrawn. */
  restyle(style: PreviewStyle): void;
  setHint(key: string | null): void;
}

function action(texts: Texts, ctx: AppContext, icon: string, labelKey: string, main: boolean): HTMLButtonElement {
  const label = texts.text(el('span', { class: 'act__label' }), () => ctx.i18n.t(labelKey));
  return el(
    'button',
    { class: main ? 'act act--main' : 'act', type: 'button', 'data-quiet': true },
    el('span', { class: 'act__disc' }, svg(icon)),
    label,
  );
}

export function createHud(ctx: AppContext, challengeMode: boolean, initialStyle: PreviewStyle): Hud {
  const { i18n } = ctx;
  const texts = new Texts();
  const t = (key: string) => () => i18n.t(key);
  let style = initialStyle;

  // Header
  const pause = el('button', { class: 'icon-btn game__pause', type: 'button' }, svg(ICONS.pause));
  texts.attr(pause, 'aria-label', t('action.pause'));
  const header = el('header', { class: 'game__header' }, brand('inline'), pause);

  // Stats
  const score = el('span', { class: 'stat__value' });
  const stage = el('span', { class: 'stat__value' });
  const chain = el('span', { class: 'stat__value' });
  const chainStat = el(
    'div',
    { class: 'stat stat--chain' },
    texts.text(el('span', { class: 'label' }), t('hud.chain')),
    chain,
  );
  const nextSmall = el('canvas', { 'aria-hidden': 'true' });
  const nextStat = el(
    'div',
    { class: 'stat stat--next' },
    texts.text(el('span', { class: 'label' }), t('hud.next.short')),
    nextSmall,
  );
  const stats = el(
    'div',
    { class: 'game__stats' },
    el('div', { class: 'stat stat--score' }, texts.text(el('span', { class: 'label' }), t('hud.score')), score),
    el(
      'div',
      { class: 'stat stat--stage' },
      texts.text(el('span', { class: 'label' }), t(challengeMode ? 'hud.pieces' : 'hud.stage')),
      stage,
    ),
    chainStat,
    nextStat,
  );

  // Board
  const fallback = el('p');
  const canvas = el('canvas', { class: 'board', role: 'img', tabindex: -1 }, fallback);
  texts.attr(canvas, 'aria-label', t('a11y.board'));
  const describe = texts.text(el('button', { class: 'btn btn--secondary board-describe', type: 'button' }), t('a11y.describe'));
  const frame = el('div', { class: 'board-frame' }, el('div', { class: 'board-frame__inner' }, canvas));
  const boardSlot = el('div', { class: 'game__board' }, frame, describe);

  // Goal
  const goalTextNode = el('span', { class: 'goal__text' });
  const goalProgress = el('span', { class: 'goal__progress' });
  const hint = el('span', { class: 'goal__hint' });
  const goal = el(
    'div',
    { class: 'game__goal' },
    texts.text(el('span', { class: 'label goal__label' }), t(challengeMode ? 'hud.goal.challenge' : 'hud.goal')),
    goalTextNode,
    goalProgress,
    hint,
  );

  // Queue (wide layouts)
  const nextLarge = el('canvas', { 'aria-hidden': 'true' });
  const heldLarge = el('canvas', { 'aria-hidden': 'true' });
  const queue = el(
    'div',
    { class: 'game__queue' },
    el(
      'div',
      { class: 'queue__slot' },
      el(
        'span',
        { class: 'label' },
        texts.text(el('span', { class: 'queue__long' }), t('hud.next')),
        texts.text(el('span', { class: 'queue__short' }), t('hud.next.short')),
      ),
      el('div', { class: 'queue__box' }, nextLarge),
    ),
    el(
      'div',
      { class: 'queue__slot' },
      texts.text(el('span', { class: 'label' }), t('hud.held')),
      el('div', { class: 'queue__box' }, heldLarge),
    ),
  );

  // Actions
  const rotate = action(texts, ctx, ICONS.rotate, 'action.rotate', false);
  const drop = action(texts, ctx, ICONS.drop, 'action.drop', true);
  const swap = action(texts, ctx, ICONS.swap, 'action.swap', false);
  const heldSmall = el('canvas', { class: 'act__held', 'aria-hidden': 'true' });
  swap.querySelector('.act__disc')?.append(heldSmall);
  const actions = el('div', { class: 'game__actions' }, rotate, drop, swap);

  // Keyboard hint (fine pointers, wide layouts)
  const cap = (content: Node | string): HTMLElement => el('kbd', null, content);
  const caps = (...nodes: HTMLElement[]): HTMLElement => el('span', { class: 'keys__caps' }, ...nodes);
  const keyLabel = (key: string): HTMLElement => texts.text(el('span'), t(key));
  const space = texts.text(el('kbd'), t('key.space'));
  const keys = el(
    'div',
    { class: 'game__keys', 'aria-hidden': 'true' },
    texts.text(el('span', { class: 'label' }), t('hud.controls')),
    el(
      'div',
      { class: 'keys__list' },
      caps(cap(svg(ICONS.left)), cap(svg(ICONS.right))),
      keyLabel('action.move'),
      caps(cap(svg(ICONS.up))),
      keyLabel('action.rotate'),
      caps(space),
      keyLabel('action.drop'),
      caps(cap('C')),
      keyLabel('action.swap'),
      caps(cap('P')),
      keyLabel('action.pause'),
    ),
  );

  const root = el('div', { class: 'game' }, header, stats, boardSlot, goal, queue, el('div', { class: 'game__side' }, keys, actions));

  const previews = {
    nextSmall: new PiecePreviewCanvas(nextSmall, 9),
    nextLarge: new PiecePreviewCanvas(nextLarge, 22),
    heldLarge: new PiecePreviewCanvas(heldLarge, 22),
    heldSmall: new PiecePreviewCanvas(heldSmall, 8),
  };

  // Last shown values. NaN / '' force the first write.
  const shown = {
    score: NaN,
    stage: NaN,
    chain: NaN,
    chainLive: false,
    goalKind: '',
    goalTarget: NaN,
    goalProgress: NaN,
    canSwap: true,
    held: false,
    ratio: 0,
  };
  const scoreText = { value: '' };
  const stageText = { value: '' };
  const chainTextCache = { value: '' };
  const goalTextCache = { value: '' };
  const goalProgressCache = { value: '' };

  function update(view: GameView): void {
    if (view.score !== shown.score) {
      shown.score = view.score;
      setText(score, scoreText, formatCount(i18n, view.score));
    }
    const stageValue = challengeMode ? (view.piecesLeft ?? 0) : view.stage;
    if (stageValue !== shown.stage) {
      shown.stage = stageValue;
      setText(stage, stageText, pad2(stageValue));
    }
    if (view.chain !== shown.chain) {
      shown.chain = view.chain;
      setText(chain, chainTextCache, chainText(view.chain));
    }
    const live = view.phase === 'resolving' && view.chain > 0;
    if (live !== shown.chainLive) {
      shown.chainLive = live;
      chainStat.toggleAttribute('data-live', live);
    }
    const g = view.goal;
    if (g.kind !== shown.goalKind || g.target !== shown.goalTarget) {
      shown.goalKind = g.kind;
      shown.goalTarget = g.target;
      setText(goalTextNode, goalTextCache, goalText(i18n, g));
      shown.goalProgress = NaN;
    }
    if (g.progress !== shown.goalProgress) {
      shown.goalProgress = g.progress;
      setText(goalProgress, goalProgressCache, goalProgressText(i18n, g));
    }
    if (view.canSwap !== shown.canSwap) {
      shown.canSwap = view.canSwap;
      swap.disabled = !view.canSwap;
    }
    const hasHeld = view.held !== null;
    if (hasHeld !== shown.held) {
      shown.held = hasHeld;
      swap.toggleAttribute('data-held', hasHeld);
    }
    const skin = ctx.skin();
    const ratio = boardAspect(view.cols, view.rows, ctx.skin().bed.pad);
    if (ratio !== shown.ratio) {
      shown.ratio = ratio;
      root.style.setProperty('--board-ratio', ratio.toFixed(4));
    }
    // Previews compare a content key themselves and skip hidden canvases.
    previews.nextSmall.draw(view.next, skin, style);
    previews.nextLarge.draw(view.next, skin, style);
    previews.heldLarge.draw(view.held, skin, style, !view.canSwap);
    // The disabled button already steps back; do not dim its preview twice.
    previews.heldSmall.draw(view.held, skin, style);
  }

  function reset(): void {
    shown.score = NaN;
    shown.stage = NaN;
    shown.chain = NaN;
    shown.goalKind = '';
    shown.goalProgress = NaN;
    scoreText.value = '';
    goalTextCache.value = '';
    goalProgressCache.value = '';
  }

  let hintKey: string | null = null;
  function showHint(): void {
    hint.textContent = hintKey ? i18n.t(hintKey) : '';
    goal.toggleAttribute('data-hint', hintKey !== null);
  }

  return {
    root,
    canvas,
    frame,
    boardSlot,
    pause,
    rotate,
    drop,
    swap,
    describe,
    fallback,
    update,
    relabel(view) {
      texts.refresh();
      reset();
      showHint();
      update(view);
    },
    restyle(next) {
      style = next;
      for (const preview of Object.values(previews)) preview.invalidate();
    },
    setHint(key) {
      if (key === hintKey) return;
      hintKey = key;
      showHint();
    },
  };
}
