/**
 * Decorative, aria-hidden nodes the theme needs and CSS alone cannot draw: the chains
 * and the flourish of the hanging name sign, sparkles over the menu picture, brass
 * bosses on the corners of the board frame. Idempotent: it runs again after every
 * live skin switch and every rebuild of a screen.
 */
import type { SkinScreen } from '../../skin';

const NS = 'szk';

/** A sprig either side of a small hexagonal tile: the rule under the name. */
const FLOURISH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 22" fill="none">' +
  '<path d="M8 11H86M134 11H212" stroke="#B98E36" stroke-width="1.4" stroke-linecap="round"/>' +
  '<g fill="#2E8257">' +
  '<path d="M86 11c-6-7-15-8-22-4 7 4 15 6 22 4z"/><path d="M86 11c-6 7-15 8-22 4 7-4 15-6 22-4z" fill="#1F6A4A"/>' +
  '<path d="M60 11c-5-5-12-6-17-3 5 3 11 4 17 3z"/><path d="M60 11c-5 5-12 6-17 3 5-3 11-4 17-3z" fill="#1F6A4A"/>' +
  '<path d="M134 11c6-7 15-8 22-4-7 4-15 6-22 4z"/><path d="M134 11c6 7 15 8 22 4-7-4-15-6-22-4z" fill="#1F6A4A"/>' +
  '<path d="M160 11c5-5 12-6 17-3-5 3-11 4-17 3z"/><path d="M160 11c5 5 12 6 17 3-5-3-11-4-17-3z" fill="#1F6A4A"/>' +
  '</g>' +
  '<path d="M110 1.5l8.2 4.75v9.5L110 20.5l-8.2-4.75v-9.5z" fill="#F4B224" stroke="#8F4F08" stroke-width="1.2" stroke-linejoin="round"/>' +
  '<path d="M110 4.2l5.8 3.4v3.2c-3-2.6-7.4-3.4-11.6-2.2V7.6z" fill="#FFEDA8"/>' +
  '<circle cx="110" cy="11.6" r="2.6" fill="#FFFBE6"/>' +
  '<circle cx="8" cy="11" r="2" fill="#C79A3E"/><circle cx="212" cy="11" r="2" fill="#C79A3E"/>' +
  '</svg>';

function node(markup: string, className: string): Element | null {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const element = template.content.firstElementChild;
  if (!element) return null;
  element.setAttribute('class', className);
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('focusable', 'false');
  // Hidden unless this theme shows it: the nodes outlive a switch to another skin.
  element.setAttribute('style', 'display:none');
  return element;
}

function span(className: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  element.setAttribute('aria-hidden', 'true');
  element.style.display = 'none';
  return element;
}

function decorateMenu(root: HTMLElement): void {
  const brand = root.querySelector('.menu__brand .brand');
  if (brand && !brand.querySelector(`.${NS}-flourish`)) {
    const flourish = node(FLOURISH, `${NS}-flourish`);
    if (flourish) brand.append(flourish);
    brand.prepend(span(`${NS}-chain ${NS}-chain--left`), span(`${NS}-chain ${NS}-chain--right`));
  }
  const art = root.querySelector('.menu__art');
  if (art && !art.querySelector(`.${NS}-twinkles`)) {
    const holder = span(`${NS}-twinkles`);
    for (let i = 0; i < 4; i++) holder.append(span(`${NS}-twinkle`));
    art.append(holder);
  }
}

function decorateGame(root: HTMLElement): void {
  const frame = root.querySelector('.board-frame');
  if (!frame || frame.querySelector(`.${NS}-boss`)) return;
  for (const corner of ['tl', 'tr', 'bl', 'br']) frame.append(span(`${NS}-boss ${NS}-boss--${corner}`));
}

export function decorate(root: HTMLElement, screen: SkinScreen): void {
  if (screen === 'menu') decorateMenu(root);
  else if (screen === 'game') decorateGame(root);
}
