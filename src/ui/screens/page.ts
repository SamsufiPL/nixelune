/** Shared frame of the secondary screens: back button, title, scrolling body. */
import type { AppContext } from '../context';
import { el, svg, Texts } from '../dom';
import { ICONS } from '../icons';

export interface Page {
  readonly root: HTMLElement;
  readonly body: HTMLElement;
  readonly back: HTMLButtonElement;
}

export function createPage(ctx: AppContext, texts: Texts, titleKey: string): Page {
  const back = el('button', { class: 'icon-btn', type: 'button' }, svg(ICONS.back));
  texts.attr(back, 'aria-label', () => ctx.i18n.t('common.back'));
  back.addEventListener('click', () => ctx.dispatch({ type: 'back' }));
  const title = texts.text(el('h1', { class: 'page__title' }), () => ctx.i18n.t(titleKey));
  const body = el('div', { class: 'page__body' });
  const root = el(
    'main',
    { class: 'page' },
    el('div', { class: 'page__inner' }, el('header', { class: 'page__header' }, back, title), body),
  );
  return { root, body, back };
}
