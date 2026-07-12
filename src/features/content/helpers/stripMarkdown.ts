/*
 * Markdown → plain text.
 *
 * Shared by the listing-card summary (`deriveSummary`) and the search
 * index: both want the words a reader would actually see, without the
 * syntax that puts them on the page. Kept in one place so a query can
 * never match a heading marker or an image URL that no reader can see.
 */

/* Patterns that drop the match entirely (no capture group). */
const DROP_PATTERNS: ReadonlyArray<RegExp> = [
  /^---[\s\S]*?\n---\s*/,
  /^#{1,6}\s+.*$/gm,
  /^>\s*/gm,
  /^\s*[-*+]\s+/gm,
  /^\s*\d+\.\s+/gm,
  /<\/?[a-z][^>]*>/gi,
  /!\[[^\]]*\]\([^)]*\)/g,
];

/* Patterns that keep the visible text inside the capture group. */
const KEEP_PATTERNS: ReadonlyArray<RegExp> = [
  /\*\*([^*]+)\*\*/g,
  /__([^_]+)__/g,
  /\*([^*]+)\*/g,
  /_([^_]+)_/g,
  /`([^`]+)`/g,
  /\[([^\]]+)\]\([^)]*\)/g,
];

/**
 * Strip markdown decoration, keeping the visible words.
 * @param raw Raw markdown body.
 * @returns The same text with the syntax removed.
 */
export const stripMarkdown = (raw: string): string => {
  let out = raw;
  for (const re of DROP_PATTERNS) out = out.replace(re, '');
  for (const re of KEEP_PATTERNS) out = out.replace(re, (_, captured: string) => captured);
  return out;
};

/**
 * Flatten a markdown body into one line of searchable prose.
 * @param raw Raw markdown body.
 * @returns Plain text with runs of whitespace collapsed.
 */
export const toPlainText = (raw: string): string => stripMarkdown(raw).replace(/\s+/g, ' ').trim();
