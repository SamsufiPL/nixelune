/** Panels over the board: pause, stage complete, results. Real dialogs with real buttons. */
import type { GameView } from '../../game/types';
import { symbol } from '../brand';
import type { AppContext } from '../context';
import { el } from '../dom';
import { formatCount, goalProgressText, goalText, pointsText, splitTitle } from '../format';
import type { Session } from '../session';

export interface Panel {
  readonly root: HTMLElement;
  /** The control that takes focus when the panel opens. */
  readonly primary: HTMLButtonElement;
}

let panelId = 0;

function shell(title: HTMLElement, ...content: (HTMLElement | SVGElement | null)[]): HTMLElement {
  const id = `nx-panel-${++panelId}`;
  title.id = id;
  const panel = el('div', { class: 'panel' });
  for (const node of content) if (node) panel.append(node);
  return el('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id }, panel);
}

function button(ctx: AppContext, kind: 'primary' | 'secondary' | 'text', key: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', { class: `btn btn--${kind}`, type: 'button' }, ctx.i18n.t(key));
  node.addEventListener('click', onClick);
  return node;
}

/** Two-tone heading of the results mockup: first word in text colour, the rest in brass. */
function twoTone(text: string): HTMLElement {
  const [first, rest] = splitTitle(text);
  return el('h2', { class: 'panel__title' }, el('span', null, first), rest ? el('span', null, rest) : null);
}

export function pausePanel(ctx: AppContext, session: Session): Panel {
  const title = el('h2', { class: 'panel__title' }, ctx.i18n.t('pause.title'));
  const resume = button(ctx, 'primary', 'pause.resume', () => ctx.dispatch({ type: 'resume' }));
  const leave = session.challenge
    ? button(ctx, 'text', 'over.challenges', () => ctx.dispatch({ type: 'quitToChallenges' }))
    : button(ctx, 'text', 'pause.menu', () => ctx.dispatch({ type: 'quitToMenu' }));
  const root = shell(
    title,
    title,
    el(
      'div',
      { class: 'panel__actions' },
      resume,
      button(ctx, 'secondary', 'pause.settings', () => ctx.dispatch({ type: 'openSettings' })),
      button(ctx, 'text', 'pause.restart', () => ctx.dispatch({ type: 'retry' })),
      leave,
    ),
  );
  return { root, primary: resume };
}

export function stagePanel(ctx: AppContext, session: Session): Panel {
  const { i18n } = ctx;
  const title = twoTone(i18n.t('stage.title'));
  const next = button(ctx, 'primary', 'stage.continue', () => ctx.dispatch({ type: 'continue' }));
  const root = shell(
    title,
    symbol('panel__symbol'),
    title,
    el('p', { class: 'panel__note' }, pointsText(i18n, 'stage.bonus', session.stageBonus)),
    el('div', { class: 'panel__actions' }, next),
  );
  return { root, primary: next };
}

export function overPanel(ctx: AppContext, session: Session, view: GameView): Panel {
  const { i18n } = ctx;
  const outcome = view.outcome;
  const won = outcome === 'challengeWon';
  const titleKey = won ? 'over.won.title' : outcome === 'challengeFailed' ? 'over.failed.title' : 'over.title';
  const title = won ? twoTone(i18n.t(titleKey)) : el('h2', { class: 'panel__title' }, i18n.t(titleKey));

  const figures = el(
    'div',
    { class: 'panel__figures' },
    el('span', { class: 'label' }, i18n.t('over.score')),
    el('span', { class: 'panel__score' }, formatCount(i18n, view.score)),
  );
  let note: HTMLElement;
  if (session.challenge) {
    note = el('p', { class: 'help' }, `${goalText(i18n, view.goal)} · ${goalProgressText(i18n, view.goal)}`);
  } else if (view.score > session.bestBefore && view.score > 0) {
    note = el('p', { class: 'panel__note' }, i18n.t('over.newBest'));
  } else {
    note = el(
      'p',
      { class: 'help' },
      `${i18n.t('over.best')} ${formatCount(i18n, Math.max(session.bestBefore, view.score))} · ${i18n.t('over.stage', { stage: view.stage })}`,
    );
  }

  const retry = (kind: 'primary' | 'text'): HTMLButtonElement =>
    button(ctx, kind, 'over.retry', () => ctx.dispatch({ type: 'retry' }));
  let primary: HTMLButtonElement;
  let second: HTMLButtonElement;
  if (won) {
    primary = button(ctx, 'primary', 'over.challenges', () => ctx.dispatch({ type: 'quitToChallenges' }));
    second = retry('text');
  } else {
    primary = retry('primary');
    second = session.challenge
      ? button(ctx, 'text', 'over.challenges', () => ctx.dispatch({ type: 'quitToChallenges' }))
      : button(ctx, 'text', 'over.menu', () => ctx.dispatch({ type: 'quitToMenu' }));
  }
  const root = shell(title, won ? symbol('panel__symbol') : null, title, figures, note, el('div', { class: 'panel__actions' }, primary, second));
  return { root, primary };
}
