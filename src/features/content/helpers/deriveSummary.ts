/*
 * Widget summary — fallback preview text shown on cards in listings
 * when the entry has no editorial `description` in frontmatter.
 *
 * Rules:
 * - Strip markdown decorations (headings, lists, bold, italic, …).
 * - Take the first non-trivial paragraph.
 * - Truncate on a word boundary at ~MAX_LEN characters; append …
 *
 * The stripper itself lives in `stripMarkdown` — the search index needs
 * exactly the same "words a reader can actually see", and one copy of
 * that rule is enough.
 */
import { stripMarkdown } from './stripMarkdown';

const MAX_LEN = 320;

/**
 * Build the preview snippet shown on listing cards. Used as a fallback
 * when the entry has no editorial `description` in frontmatter.
 *
 * @param body Raw markdown body.
 * @returns Short summary (~320 chars), or undefined if body is empty.
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
