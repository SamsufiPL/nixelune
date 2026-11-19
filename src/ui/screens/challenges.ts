/** Challenge list: a plain list with thin dividers, one row per challenge. */
import type { AppContext, ScreenView } from '../context';
import { el, focusQuietly, svg, Texts } from '../dom';
import { formatCount, goalText, pad2 } from '../format';
import { ICONS } from '../icons';
import { createPage } from './page';

export function createChallengesScreen(ctx: AppContext): ScreenView {
  const { i18n } = ctx;
  const texts = new Texts();
  const page = createPage(ctx, texts, 'challenges.title');

  if (ctx.challenges.length === 0) {
    page.body.append(texts.text(el('p', { class: 'page__empty' }), () => i18n.t('challenges.empty')));
  } else {
    const list = el('ol', { class: 'challenges' });
    ctx.challenges.forEach((challenge, index) => {
      const goal = el('span', { class: 'challenge__goal' });
      const meta = el('span', { class: 'challenge__meta' });
      const stateText = el('span', { class: 'label' });
      const state = el('span', { class: 'challenge__state' }, svg(ICONS.check), stateText);
      stateText.style.color = 'inherit';
      const row = el(
        'button',
        { class: 'challenge', type: 'button' },
        el('span', { class: 'challenge__number', 'aria-hidden': 'true' }, pad2(index + 1)),
        el('span', { class: 'challenge__text' }, goal, meta),
        state,
      );
      row.addEventListener('click', () => ctx.dispatch({ type: 'startChallenge', id: challenge.id }));
      texts.run(() => {
        const record = ctx.services.save.data.challenges[challenge.id];
        const done = record?.completed === true;
        goal.textContent = goalText(i18n, challenge.goal);
        const pieces = i18n.t('challenges.pieces', { count: challenge.pieceLimit });
        meta.textContent =
          done && record
            ? `${pieces} · ${i18n.t('challenges.best', { value: formatCount(i18n, record.bestScore) })}`
            : pieces;
        stateText.textContent = i18n.t('challenges.completed');
        state.hidden = !done;
        row.setAttribute('aria-label', i18n.t('challenges.item', { number: index + 1 }));
        row.setAttribute('aria-description', `${goal.textContent}. ${meta.textContent}${done ? `. ${stateText.textContent}` : ''}`);
      });
      list.append(el('li', null, row));
    });
    page.body.append(list);
  }

  return {
    root: page.root,
    refresh: () => texts.refresh(),
    dispose: () => undefined,
    focus: () => focusQuietly(page.root),
  };
}
