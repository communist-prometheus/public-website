import { escapeHtml } from './escape-html';

/** A single archive entry: its path within the archive and uncompressed size. */
export interface ArchiveEntry {
  readonly name: string;
  readonly size: number;
}

/** How to order the listing. */
export type ArchiveSort = 'name' | 'size';

const units: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Human-readable byte size (e.g. `1.4 KB`). */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const rounded = exponent === 0 ? String(bytes) : value.toFixed(1);
  return `${rounded} ${units[exponent]}`;
};

const byName = (a: ArchiveEntry, b: ArchiveEntry): number => a.name.localeCompare(b.name);
const bySize = (a: ArchiveEntry, b: ArchiveEntry): number => b.size - a.size || byName(a, b);

const sortEntries = (entries: readonly ArchiveEntry[], sort: ArchiveSort): readonly ArchiveEntry[] =>
  [...entries].sort(sort === 'size' ? bySize : byName);

const rowHtml = (entry: ArchiveEntry): string =>
  `<tr><td>${escapeHtml(entry.name)}</td><td class="wfr-archive-size">${formatBytes(entry.size)}</td></tr>`;

/** Build an accessible HTML table listing the archive's entries. */
export const buildListingHtml = (
  entries: readonly ArchiveEntry[],
  sort: ArchiveSort = 'name',
): string => {
  const total = entries.reduce((sum, e) => sum + e.size, 0);
  const caption = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · ${formatBytes(total)}`;
  const rows = sortEntries(entries, sort).map(rowHtml).join('');
  return (
    `<table class="wfr-archive">` +
    `<caption>${escapeHtml(caption)}</caption>` +
    `<thead><tr><th scope="col">Name</th><th scope="col">Size</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>`
  );
};
