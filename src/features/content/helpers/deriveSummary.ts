/*
 * Widget summary — short preview text shown on cards in listings.
 *
 * Editor wants widgets (PostCard, NewspaperCard, position cards) to
 * always derive their preview from the article body, NOT from the
 * frontmatter `description` field. The frontmatter description is
 * being repurposed as the preface block on the article page itself
 * — see deriveDescription for the SEO meta path.
 *
 * Rules:
 * - Strip markdown decorations (headings, lists, bold, italic, …).
 * - Take the first non-trivial paragraph.
 * - Truncate on a word boundary at ~MAX_LEN characters; append …
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

const stripMarkdown = (raw: string): string => {
  let out = raw;
  for (const re of DROP_PATTERNS) out = out.replace(re, '');
  for (const re of KEEP_PATTERNS) out = out.replace(re, (_, captured: string) => captured);
  return out;
};

const MAX_LEN = 160;

/**
 * Build the preview snippet shown on listing cards. Always derives
 * from the article body — frontmatter `description` is reserved for
 * the lead/preface block on the detail page now.
 *
 * @param body Raw markdown body.
 * @returns Short summary (~160 chars), or undefined if body is empty.
 */
export const deriveSummary = (body: string | undefined): string | undefined => {
  if (!body) return undefined;
  const firstPara = stripMarkdown(body)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .find((p) => p.length > 0);
  if (!firstPara) return undefined;
  if (firstPara.length <= MAX_LEN) return firstPara;
  const cut = firstPara.slice(0, MAX_LEN + 1).lastIndexOf(' ');
  return `${firstPara.slice(0, cut > 0 ? cut : MAX_LEN).trimEnd()}…`;
};
