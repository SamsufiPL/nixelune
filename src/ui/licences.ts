/**
 * Data for the licences screen. The source of truth is docs/licences.md (maintained
 * with every dependency change); its table is read at build time. The built-in list
 * covers the case where the file is not there yet.
 */

export interface LicenceEntry {
  readonly name: string;
  readonly version: string;
  readonly licence: string;
}

export const FALLBACK_LICENCES: readonly LicenceEntry[] = [
  { name: 'Inter (font, @fontsource-variable/inter)', version: '5.3.0', licence: 'OFL-1.1' },
  { name: '@capacitor/core', version: '8.6.2', licence: 'MIT' },
  { name: '@capacitor/android', version: '8.6.2', licence: 'MIT' },
  { name: '@capacitor/app', version: '8.1.2', licence: 'MIT' },
  { name: '@capacitor/haptics', version: '8.0.2', licence: 'MIT' },
  { name: '@capacitor/preferences', version: '8.0.1', licence: 'MIT' },
  { name: '@capacitor/status-bar', version: '8.0.4', licence: 'MIT' },
];

function plain(cell: string): string {
  return cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
}

/**
 * Read the first Markdown table that has a licence column. Column order is taken
 * from the header, so the document can add columns without breaking the screen.
 */
export function parseLicences(markdown: string): LicenceEntry[] {
  const entries: LicenceEntry[] = [];
  let columns: { name: number; version: number; licence: number } | null = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|')) {
      if (columns && entries.length > 0) break; // the table ended
      columns = null;
      continue;
    }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(plain);
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell) || cell === '')) continue;
    if (!columns) {
      const lower = cells.map((cell) => cell.toLowerCase());
      const licence = lower.findIndex((cell) => /licen[cs]/.test(cell));
      if (licence < 0) continue;
      const version = lower.findIndex((cell) => /^(version|wersja)/.test(cell));
      const name = lower.findIndex((_, index) => index !== licence && index !== version);
      columns = { name: name < 0 ? 0 : name, version, licence };
      continue;
    }
    const name = cells[columns.name] ?? '';
    const licence = cells[columns.licence] ?? '';
    if (!name || !licence) continue;
    entries.push({ name, version: columns.version >= 0 ? (cells[columns.version] ?? '') : '', licence });
  }
  return entries;
}

export function loadLicences(documents: Record<string, string>): readonly LicenceEntry[] {
  for (const markdown of Object.values(documents)) {
    const parsed = parseLicences(markdown);
    if (parsed.length > 0) return parsed;
  }
  return FALLBACK_LICENCES;
}
