import type { SearchDoc } from '../model/doc';
import { tokenize } from '../text/normalize';
import type { PreparedIndex } from './prepared';
import { scoreDoc } from './score';
import { buildSnippet, type Snippet } from './snippet';

export type { PreparedDoc, PreparedIndex } from './prepared';
export { prepare } from './prepared';
export type { Mark, Snippet } from './snippet';

/** One result row. */
export interface SearchHit {
  readonly doc: SearchDoc;
  readonly score: number;
  readonly snippet: Snippet;
}

const DEFAULT_LIMIT = 20;

/**
 * Rank a prepared index against a query.
 *
 * A blank query returns nothing rather than everything — an empty search
 * box is not a request to list the site.
 * @param index - A prepared index (see `prepare`).
 * @param query - Raw text as typed.
 * @param limit - Maximum rows to return.
 * @returns Hits, best first.
 */
export const search = (
  index: PreparedIndex,
  query: string,
  limit: number = DEFAULT_LIMIT,
): readonly SearchHit[] => {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  return index.docs
    .map(doc => ({ doc, score: scoreDoc(doc, terms) }))
    .filter(scored => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(scored => ({
      doc: scored.doc.doc,
      score: scored.score,
      snippet: buildSnippet(scored.doc, terms),
    }));
};
