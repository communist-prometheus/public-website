/*
 * Frontmatter `description` is the canonical SEO + card summary, but
 * editors sometimes leave it empty (the schema marks it optional on
 * pages and tolerates a blank string on blog/positions/magazine).
 *
 * When that happens, fall back to the first non-trivial line of the
 * article body so the card / meta description / og:description still
 * reflect what the article is actually about.
 */

/*
 * Order matters: image markdown must be dropped before the link
 * pattern would otherwise capture the alt text. Inline comments
 * upset the eslint line-comment-position rule, so labels live in
 * this leading block instead.
 *
 *   1. frontmatter (defensive — Astro already strips it)
 *   2. headings, blockquotes, unordered + ordered list markers
 *   3. raw HTML tags
 *   4. **bold**, __bold__, *italic*, _italic_, `code`
 *   5. ![alt](url)  — drop entirely
 *   6. [text](url)  — keep the visible text only
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

const MAX_LEN = 200;

/**
 * Pick the SEO/card description for a content entry. Returns the
 * frontmatter `description` when it has at least one non-whitespace
 * character, otherwise scans the article body for the first
 * paragraph and truncates to ~200 chars on a word boundary.
 * @param description - Frontmatter description (may be undefined or '').
 * @param body - Raw markdown body to scan as fallback.
 * @returns A description string, or undefined when neither source has content.
 */
export const deriveDescription = (
  description: string | undefined,
  body: string,
): string | undefined => {
  const trimmed = description?.trim();
  if (trimmed) return trimmed;

  const firstPara = stripMarkdown(body)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .find((p) => p.length > 0);

  if (!firstPara) return undefined;
  if (firstPara.length <= MAX_LEN) return firstPara;

  const cut = firstPara.slice(0, MAX_LEN + 1).lastIndexOf(' ');
  return `${firstPara.slice(0, cut > 0 ? cut : MAX_LEN).trimEnd()}…`;
};
