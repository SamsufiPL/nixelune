/** Settings: every control is a native form element or a button with a switch role. */
import { LANGUAGES, type Settings } from '../../platform/types';
import type { AppContext, ScreenView } from '../context';
import { el, focusQuietly, svg, Texts } from '../dom';
import { ICONS } from '../icons';
import { createPage } from './page';

let groupId = 0;

export function createSettingsScreen(ctx: AppContext): ScreenView {
  const { i18n } = ctx;
  const texts = new Texts();
  const page = createPage(ctx, texts, 'settings.title');
  const t = (key: string) => () => i18n.t(key);
  const syncs: (() => void)[] = [];

  function rowText(titleKey: string, helpKey?: string, id?: string): HTMLElement {
    return el(
      'div',
      { class: 'row__text' },
      texts.text(el('span', { class: 'row__title', id }), t(titleKey)),
      helpKey ? texts.text(el('span', { class: 'row__help', id: id ? `${id}-help` : undefined }), t(helpKey)) : null,
    );
  }

  function segmented<V extends string>(
    titleKey: string,
    helpKey: string | undefined,
    options: readonly { readonly value: V; readonly labelKey: string }[],
    read: (settings: Settings) => V,
    write: (settings: Settings, value: V) => void,
  ): HTMLElement {
    const name = `nx-setting-${++groupId}`;
    const control = el('div', { class: 'segmented' });
    for (const option of options) {
      const input = el('input', { type: 'radio', name, value: option.value });
      input.addEventListener('change', () => {
        if (input.checked) ctx.updateSettings((settings) => write(settings, option.value));
      });
      syncs.push(() => {
        input.checked = read(ctx.settings()) === option.value;
      });
      control.append(el('label', { class: 'segmented__option' }, input, texts.text(el('span'), t(option.labelKey))));
    }
    const legend = texts.text(el('legend', { class: 'sr-only' }), t(titleKey));
    const group = el('fieldset', { class: 'row' }, legend, rowText(titleKey, helpKey), control);
    // The visible title duplicates the legend for sighted users only.
    group.querySelector('.row__title')?.setAttribute('aria-hidden', 'true');
    return group;
  }

  function toggle(
    titleKey: string,
    helpKey: string | undefined,
    read: (settings: Settings) => boolean,
    write: (settings: Settings, value: boolean) => void,
  ): HTMLElement {
    const id = `nx-setting-${++groupId}`;
    const button = el(
      'button',
      { class: 'switch', type: 'button', role: 'switch', 'aria-labelledby': id, 'aria-describedby': helpKey ? `${id}-help` : undefined },
      el('span', { class: 'switch__track' }),
    );
    button.addEventListener('click', () => {
      ctx.updateSettings((settings) => write(settings, !read(settings)));
      sync();
    });
    const sync = (): void => button.setAttribute('aria-checked', String(read(ctx.settings())));
    syncs.push(sync);
    return el('div', { class: 'row' }, rowText(titleKey, helpKey, id), button);
  }

  function volume(): HTMLElement {
    const id = `nx-setting-${++groupId}`;
    const input = el('input', { type: 'range', min: 0, max: 100, step: 5, 'aria-labelledby': id });
    const output = el('output');
    const show = (percent: number): void => {
      output.textContent = i18n.t('settings.sound.value', { percent });
      input.style.setProperty('--fill', `${percent}%`);
      input.setAttribute('aria-valuetext', output.textContent);
    };
    input.addEventListener('input', () => {
      const percent = Number(input.value);
      show(percent);
      ctx.updateSettings((settings) => {
        settings.soundVolume = percent / 100;
      });
    });
    // A short sample on release tells the player what the new level sounds like.
    input.addEventListener('change', () => ctx.services.audio.play('uiTap'));
    syncs.push(() => {
      const percent = Math.round(ctx.settings().soundVolume * 100);
      input.value = String(percent);
      show(percent);
    });
    return el('div', { class: 'row' }, rowText('settings.sound', undefined, id), el('div', { class: 'range' }, input, output));
  }

  // Temporary: lets the creator compare candidate looks. Goes away with the losing skins.
  function look(): HTMLElement {
    const name = `nx-setting-${++groupId}`;
    const control = el('div', { class: 'segmented segmented--wrap' });
    for (const choice of ctx.skins.choices) {
      const input = el('input', { type: 'radio', name, value: choice.id });
      input.addEventListener('change', () => {
        if (input.checked) ctx.selectSkin(choice.id);
      });
      syncs.push(() => {
        input.checked = ctx.skins.id === choice.id;
      });
      control.append(el('label', { class: 'segmented__option' }, input, texts.text(el('span'), () => choice.name[i18n.language])));
    }
    const legend = texts.text(el('legend', { class: 'sr-only' }), t('settings.look'));
    const group = el('fieldset', { class: 'row' }, legend, rowText('settings.look', 'settings.look.help'), control);
    group.querySelector('.row__title')?.setAttribute('aria-hidden', 'true');
    return group;
  }

  const about = el('button', { class: 'row-link', type: 'button' }, texts.text(el('span'), t('settings.about')), svg(ICONS.chevron));
  about.addEventListener('click', () => ctx.dispatch({ type: 'openAbout' }));

  page.body.append(
    el(
      'div',
      { class: 'rows' },
      segmented(
        'settings.language',
        undefined,
        [
          { value: 'system', labelKey: 'settings.language.system' },
          ...LANGUAGES.map((code) => ({ value: code, labelKey: `settings.language.${code}` })),
        ],
        (settings) => settings.language,
        (settings, value) => {
          settings.language = value;
        },
      ),
      volume(),
      toggle(
        'settings.haptics',
        undefined,
        (settings) => settings.haptics,
        (settings, value) => {
          settings.haptics = value;
        },
      ),
      segmented(
        'settings.motion',
        'settings.motion.help',
        [
          { value: 'system', labelKey: 'settings.motion.system' },
          { value: 'on', labelKey: 'settings.motion.on' },
          { value: 'off', labelKey: 'settings.motion.off' },
        ],
        (settings) => settings.reducedMotion,
        (settings, value) => {
          settings.reducedMotion = value;
        },
      ),
      toggle(
        'settings.marks',
        'settings.marks.help',
        (settings) => settings.tileMarks,
        (settings, value) => {
          settings.tileMarks = value;
        },
      ),
      toggle(
        'settings.contrast',
        'settings.contrast.help',
        (settings) => settings.highContrast,
        (settings, value) => {
          settings.highContrast = value;
        },
      ),
      ctx.skins.choices.length > 1 ? look() : null,
    ),
    about,
  );

  const syncAll = (): void => {
    for (const sync of syncs) sync();
  };
  syncAll();

  return {
    root: page.root,
    refresh: () => {
      texts.refresh();
      syncAll();
    },
    dispose: () => undefined,
    focus: () => focusQuietly(page.root),
  };
}
