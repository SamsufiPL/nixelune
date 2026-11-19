/** Tiny DOM helpers. No framework: screens are built once and updated in place. */

type Attrs = Record<string, string | number | boolean | null | undefined>;
type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) {
    for (const name of Object.keys(attrs)) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) continue;
      if (name === 'class') node.className = String(value);
      else node.setAttribute(name, value === true ? '' : String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** Parse trusted, static SVG markup (icons and the logo symbol defined in this code base). */
export function svg(markup: string, className?: string): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const node = template.content.firstElementChild as SVGSVGElement;
  if (className) node.setAttribute('class', className);
  if (!node.hasAttribute('aria-label')) node.setAttribute('aria-hidden', 'true');
  node.setAttribute('focusable', 'false');
  return node;
}

/**
 * Bindings between translated text and DOM. A screen registers how each text is
 * produced; `refresh` runs them all again after a language change.
 */
export class Texts {
  private readonly bindings: (() => void)[] = [];

  /** Set and keep `node.textContent` in sync with `produce()`. */
  text<T extends Node>(node: T, produce: () => string): T {
    const apply = (): void => {
      node.textContent = produce();
    };
    this.bindings.push(apply);
    apply();
    return node;
  }

  attr<T extends Element>(node: T, name: string, produce: () => string): T {
    const apply = (): void => node.setAttribute(name, produce());
    this.bindings.push(apply);
    apply();
    return node;
  }

  /** Run an arbitrary update now and on every refresh. */
  run(update: () => void): void {
    this.bindings.push(update);
    update();
  }

  refresh(): void {
    for (const apply of this.bindings) apply();
  }
}

/**
 * Put focus at the start of a new screen without drawing a ring on a control the
 * player did not choose. Tab continues from here to the first button.
 */
export function focusQuietly(node: HTMLElement): void {
  node.tabIndex = -1;
  node.focus({ preventScroll: true });
}

/** Write text only when it changed, so idle frames never touch layout. */
export function setText(node: Node, cache: { value: string }, next: string): void {
  if (cache.value === next) return;
  cache.value = next;
  node.textContent = next;
}
