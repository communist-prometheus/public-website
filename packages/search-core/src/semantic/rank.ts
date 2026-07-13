/*
 * The vector store answers in PASSAGES. A long article contributes dozens
 * of them, and a query about its subject will match several — so the raw
 * answer is the same article over and over. The reader asked about a
 * topic, not about a paragraph: collapse to one row per article, keeping
 * the strongest passage, because that is where they should be taken.
 */

/** One passage returned by the vector store. */
export interface PassageMatch {
  /** The document id — `${lang}/${section}/${slug}`. */
  readonly doc: string;
  readonly score: number;
  /** Where the passage sits in the document body. */
  readonly start: number;
  readonly end: number;
}

const DEFAULT_LIMIT = 10;

/**
 * Collapse passage matches into one row per document.
 * @param matches - Passages, in any order.
 * @param limit - Maximum documents to return.
 * @returns Documents, best first, each carrying its strongest passage.
 */
export const bestPerDoc = (
  matches: readonly PassageMatch[],
  limit: number = DEFAULT_LIMIT,
): readonly PassageMatch[] => {
  const best = new Map<string, PassageMatch>();
  for (const match of matches) {
    const current = best.get(match.doc);
    if (current === undefined || match.score > current.score) {
      best.set(match.doc, match);
    }
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
