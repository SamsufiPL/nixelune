/** Main menu, after the mobile menu mockup: logo, promise, a quiet orbit, three actions. */
import { brand } from '../brand';
import type { AppContext, ScreenView } from '../context';
import { el, focusQuietly, svg, Texts } from '../dom';
import { formatCount } from '../format';

const SQ = Math.sqrt(3) / 2;

function hexPoints(cx: number, cy: number, r: number): string {
  const p = [
    [cx + SQ * r, cy + r / 2],
    [cx, cy + r],
    [cx - SQ * r, cy + r / 2],
    [cx - SQ * r, cy - r / 2],
    [cx, cy - r],
    [cx + SQ * r, cy - r / 2],
  ];
  return p.map(([x, y]) => `${(x ?? 0).toFixed(2)},${(y ?? 0).toFixed(2)}`).join(' ');
}

/** The six tiles and the ring of the menu mockup, same coordinates, no glow. */
function orbitArt(): SVGSVGElement {
  const tiles: readonly (readonly [number, number, string])[] = [
    [402, 623, '#64D3C1'],
    [450, 695, '#8DBEF1'],
    [594, 623, '#F18479'],
    [642, 695, '#F0BD75'],
    [498, 767, '#B5A7E4'],
    [354, 839, '#64D3C1'],
  ];
  let body = '';
  for (const [x, y, fill] of tiles) {
    body +=
      `<polygon points="${hexPoints(x, y, 54)}" fill="${fill}" stroke="${fill}" stroke-width="2" stroke-linejoin="round" opacity="0.94"/>` +
      `<polygon points="${hexPoints(x, y, 39)}" fill="url(#nx-menu-bevel)" opacity="0.55"/>`;
  }
  return svg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="206 462 488 488" preserveAspectRatio="xMidYMid meet">' +
      '<defs><linearGradient id="nx-menu-bevel" x1="0" y1="0" x2="1" y2="1">' +
      '<stop stop-color="#FFFFFF" stop-opacity=".24"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity=".03"/>' +
      '<stop offset="1" stop-color="#000000" stop-opacity=".25"/></linearGradient></defs>' +
      '<circle cx="450" cy="706" r="232" fill="none" stroke="#D7AA75" stroke-width="1.5" opacity="0.42" vector-effect="non-scaling-stroke"/>' +
      body +
      '</svg>',
    'menu__orbit',
  );
}

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
    orbitArt(),
    el('nav', { class: 'menu__actions' }, play, challenges, settings),
    best,
  );

  return {
    root,
    refresh: () => texts.refresh(),
    dispose: () => undefined,
    focus: () => focusQuietly(root),
  };
}
