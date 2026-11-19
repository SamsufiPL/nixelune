/** Main menu, after the mobile menu mockup: logo, promise, a quiet orbit, three actions. */
import { brand } from '../brand';
import type { AppContext, ScreenView } from '../context';
import { el, focusQuietly, Texts } from '../dom';
import { formatCount } from '../format';

export function createMenuScreen(ctx: AppContext): ScreenView {
  const { i18n } = ctx;
  const texts = new Texts();
  const t = (key: string) => () => i18n.t(key);

  const play = texts.text(el('button', { class: 'btn btn--primary btn--large', type: 'button' }), t('menu.play'));
  const challenges = texts.text(el('button', { class: 'btn btn--secondary', type: 'button' }), t('menu.challenges'));
  const settings = texts.text(el('button', { class: 'btn btn--text', type: 'button' }), t('menu.settings'));
  play.addEventListener('click', () => ctx.dispatch({ type: 'play' }));
  challenges.addEventListener('click', () => ctx.dispatch({ type: 'openChallenges' }));
  settings.addEventListener('click', () => ctx.dispatch({ type: 'openSettings' }));

  const bestLabel = texts.text(el('span', { class: 'label' }), t('menu.best'));
  const bestValue = el('b');
  const best = el('p', { class: 'menu__best' }, bestLabel, bestValue);
  texts.run(() => {
    const score = ctx.services.save.data.bestScore;
    best.hidden = score <= 0;
    bestValue.textContent = formatCount(i18n, score);
  });

  // The picture between the promise and the buttons belongs to the skin.
  const art = el('div', { class: 'menu__art', 'aria-hidden': 'true' });
  const skinName = el('span');
  const skinSwitch = el('button', { class: 'btn btn--text menu__skin', type: 'button' }, el('span', { class: 'label' }), skinName);
  skinSwitch.hidden = ctx.skins.choices.length < 2;
  skinSwitch.addEventListener('click', () => {
    const choices = ctx.skins.choices;
    const at = choices.findIndex((choice) => choice.id === ctx.skins.id);
    const next = choices[(at + 1) % choices.length];
    if (next) ctx.selectSkin(next.id);
  });
  let artSkin = '';
  texts.run(() => {
    const label = skinSwitch.firstElementChild;
    if (label) label.textContent = i18n.t('settings.look');
    skinName.textContent = ctx.skins.choices.find((choice) => choice.id === ctx.skins.id)?.name[i18n.language] ?? ctx.skins.id;
    if (artSkin !== ctx.skins.id) {
      artSkin = ctx.skins.id;
      const picture = ctx.skin().ui.menuArt?.() ?? null;
      art.replaceChildren();
      if (picture) art.append(picture);
    }
  });

  const root = el(
    'main',
    { class: 'menu' },
    el('div', { class: 'menu__brand' }, brand('stacked', 'h1')),
    el(
      'div',
      { class: 'menu__promise' },
      texts.text(el('p', { class: 'menu__lead' }), t('menu.promise.lead')),
      texts.text(el('p', { class: 'menu__rest' }), t('menu.promise.rest')),
    ),
    art,
    el('nav', { class: 'menu__actions' }, play, challenges, settings),
    best,
    skinSwitch,
  );

  return {
    root,
    refresh: () => texts.refresh(),
    dispose: () => undefined,
    focus: () => focusQuietly(root),
  };
}
