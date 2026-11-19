/** About and licences: what the game is, its version, and the third-party licences. */
import { BRAND_NAME } from '../brand';
import type { AppContext, ScreenView } from '../context';
import { el, focusQuietly, Texts } from '../dom';
import { createPage } from './page';

export function createAboutScreen(ctx: AppContext): ScreenView {
  const { i18n } = ctx;
  const texts = new Texts();
  const page = createPage(ctx, texts, 'about.title');

  const list = el('ul', { class: 'licences' });
  for (const entry of ctx.licences) {
    list.append(
      el(
        'li',
        null,
        el('span', { class: 'licences__name' }, entry.version ? `${entry.name} ${entry.version}` : entry.name),
        el('span', { class: 'licences__licence' }, entry.licence),
      ),
    );
  }

  page.body.append(
    el(
      'div',
      { class: 'about' },
      el(
        'section',
        { class: 'about__lead' },
        el('p', { class: 'heading' }, BRAND_NAME),
        texts.text(el('p', { class: 'label' }), () => i18n.t('about.version', { version: ctx.version })),
        texts.text(el('p', { class: 'about__body' }), () => i18n.t('about.body')),
      ),
      el(
        'section',
        null,
        texts.text(el('h2', { class: 'label' }), () => i18n.t('about.licences')),
        texts.text(el('p', { class: 'about__body' }), () => i18n.t('about.licences.intro')),
        list,
      ),
    ),
  );

  return {
    root: page.root,
    refresh: () => texts.refresh(),
    dispose: () => undefined,
    focus: () => focusQuietly(page.root),
  };
}
