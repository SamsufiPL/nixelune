/** Screen reader support: a polite live region that does not flood, and a board summary. */
import type { GameView, PiecePreview, TileColor } from '../game/types';
import type { I18n } from '../platform/types';
import { formatCount, goalProgressText, goalText } from './format';

/** Minimum gap between routine announcements, ms. Important ones always go through. */
export const ANNOUNCE_GAP_MS = 2500;

export class Announcer {
  private lastAt = -Infinity;
  private toggle = false;

  constructor(
    private readonly region: { textContent: string | null },
    private readonly clock: () => number = () => performance.now(),
  ) {}

  /** Routine messages are dropped when one was spoken moments ago. Returns true if announced. */
  announce(text: string, important = false): boolean {
    const now = this.clock();
    if (!important && now - this.lastAt < ANNOUNCE_GAP_MS) return false;
    this.lastAt = now;
    // A trailing no-break space makes a repeated message a new string for the reader.
    this.toggle = !this.toggle;
    this.region.textContent = this.toggle ? text : `${text} `;
    return true;
  }
}

function colorName(i18n: I18n, color: TileColor): string {
  return i18n.t(`color.${color}`);
}

function pieceColor(i18n: I18n, piece: PiecePreview): string {
  const first = piece.cells[0];
  return first ? colorName(i18n, first.color) : '';
}

/** The text alternative of the canvas: what a sighted player reads off the board. */
export function describeBoard(view: GameView, i18n: I18n): string {
  const parts: string[] = [];
  parts.push(
    i18n.t('a11y.summary.status', {
      score: formatCount(i18n, view.score),
      stage: view.stage,
      goal: goalText(i18n, view.goal),
      progress: goalProgressText(i18n, view.goal),
    }),
  );
  let filled = 0;
  let top = view.rows;
  for (let i = 0; i < view.cells.length; i++) {
    if (!view.cells[i]) continue;
    filled++;
    const row = Math.floor(i / view.cols);
    if (row < top) top = row;
  }
  parts.push(
    filled === 0
      ? i18n.t('a11y.summary.empty')
      : i18n.t('a11y.summary.board', { count: filled, top: top + 1, rows: view.rows }),
  );
  const active = view.active;
  if (active && active.length > 0) {
    let from = Infinity;
    let to = -Infinity;
    let row = Infinity;
    for (const cell of active) {
      if (cell.col < from) from = cell.col;
      if (cell.col > to) to = cell.col;
      if (cell.row < row) row = cell.row;
    }
    const first = active[0];
    parts.push(
      i18n.t('a11y.summary.active', {
        color: first ? colorName(i18n, first.color) : '',
        from: from + 1,
        to: to + 1,
        row: row + 1,
      }),
    );
  }
  parts.push(i18n.t('a11y.summary.next', { color: pieceColor(i18n, view.next) }));
  parts.push(
    view.held ? i18n.t('a11y.summary.held', { color: pieceColor(i18n, view.held) }) : i18n.t('a11y.summary.held.none'),
  );
  return parts.join(' ');
}
