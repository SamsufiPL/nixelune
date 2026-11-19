/** Small text helpers for the HUD and panels. Pure. */
import type { Goal, GoalKind } from '../game/types';
import type { I18n } from '../platform/types';

const groupers = new Map<string, Intl.NumberFormat>();

/**
 * Whole number with grouping separators, always: "2 400", not "2400". Polish CLDR
 * rules group only from five digits up, but the kit's copy writes "+2 400 punktów".
 * Falls back to the i18n service when Intl cannot do it.
 */
export function formatCount(i18n: I18n, value: number): string {
  try {
    let format = groupers.get(i18n.language);
    if (!format) {
      // 'always' is ES2023; the project's lib is ES2022, hence the cast.
      const grouping = 'always' as unknown as boolean;
      format = new Intl.NumberFormat(i18n.language, { useGrouping: grouping, maximumFractionDigits: 0 });
      groupers.set(i18n.language, format);
    }
    return format.format(value);
  } catch {
    return i18n.formatNumber(value);
  }
}

/** Two-digit counter as in the kit ("04", "×06"); longer numbers are left alone. */
export function pad2(value: number): string {
  const n = Math.max(0, Math.floor(value));
  return n < 10 ? `0${n}` : String(n);
}

export function chainText(chain: number): string {
  return `×${pad2(chain)}`;
}

/** Split a two-word title for the two-tone panel heading ("Ścieżka" / "domknięta"). */
export function splitTitle(title: string): readonly [string, string] {
  const at = title.indexOf(' ');
  if (at < 0) return [title, ''];
  return [title.slice(0, at), title.slice(at + 1)];
}

const GOAL_KEY: Readonly<Record<GoalKind, string>> = {
  paths: 'goal.paths',
  chain: 'goal.chain',
  tiles: 'goal.tiles',
  score: 'goal.score',
};

/** "Połącz 3 świetlne ścieżki" for a goal definition. */
export function goalText(i18n: I18n, goal: { readonly kind: GoalKind; readonly target: number }): string {
  return i18n.t(GOAL_KEY[goal.kind], { count: goal.target, value: formatCount(i18n, goal.target) });
}

/** Progress never reads above the target, whatever the simulation reports. */
export function goalProgressText(i18n: I18n, goal: Goal): string {
  const done = Math.min(goal.target, Math.max(0, goal.progress));
  return i18n.t('goal.progress', { done: formatCount(i18n, done), target: formatCount(i18n, goal.target) });
}

/** "+2 400 punktów". */
export function pointsText(i18n: I18n, key: string, points: number): string {
  return i18n.t(key, { count: points, value: formatCount(i18n, points) });
}
