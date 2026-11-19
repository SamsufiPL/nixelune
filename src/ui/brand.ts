/**
 * The NIXELUNE symbol, geometry copied from docs/brand-kit/03_logo/ (arc, the N path
 * and four nodes in a 100 x 100 box). Inline so it inherits nothing and needs no request.
 */
import { el, svg } from './dom';

const SYMBOL =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 1 84 84">' +
  '<path d="M19 69 A37 37 0 1 1 71 16" stroke="#D7AA75" fill="none" stroke-width="3.1" stroke-linecap="round" opacity=".68"/>' +
  '<path d="M21 74 L39 29 L63 64 L79 27" stroke="#D7AA75" fill="none" stroke-width="4.8" stroke-linejoin="round" stroke-linecap="round"/>' +
  '<circle cx="21" cy="74" r="5.4" fill="#64D3C1"/>' +
  '<circle cx="39" cy="29" r="5.4" fill="#D7AA75"/>' +
  '<circle cx="63" cy="64" r="5.4" fill="#F18479"/>' +
  '<circle cx="79" cy="27" r="5.4" fill="#D7AA75"/>' +
  '</svg>';

export const BRAND_NAME = 'NIXELUNE';

export function symbol(className: string): SVGSVGElement {
  return svg(SYMBOL, className);
}

/** Symbol plus wordmark. The name is a proper noun and is not translated. */
export function brand(variant: 'inline' | 'stacked', headingTag: 'h1' | 'div' = 'div'): HTMLElement {
  return el(
    headingTag,
    { class: variant === 'stacked' ? 'brand brand--stacked' : 'brand' },
    symbol('brand__symbol'),
    el('span', { class: 'brand__word' }, BRAND_NAME),
  );
}
