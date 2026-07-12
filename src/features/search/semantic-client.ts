import type { SearchDoc, SearchHit } from '@prometheus/search-core';
import { passageSnippet } from '@prometheus/search-core';

/*
 * Meaning search. The query — and only the query — goes to the Worker,
 * which embeds it and asks the vector store which passages are close.
 * What comes back is coordinates: document id, and where in the body the
 * matching passage sits. The article itself is already here, in the index
 * the page downloaded, so nothing large ever travels.
 *
 * An id the local index does not know is dropped. The vector store is
 * written by a background job and can lag a deploy by a minute; the index
 * is the deploy. When they disagree, the deploy is right — that is what
 * stops a just-deleted article surfacing.
 */

interface Coordinates {
  readonly doc: string;
  readonly score: number;
  readonly start: number;
  readonly end: number;
}

const ENDPOINT = '/api/semantic';

/**
 * Rank documents by meaning rather than by spelling.
 * @param lang - Active language; the vector store is filtered by it.
 * @param query - Raw text as typed.
 * @param docs - The documents the page already holds.
 * @returns Hits, best first, quoting the passage that matched.
 * @throws When the Worker refuses (rate limit, model failure, offline).
 */
export const semanticSearch = async (
  lang: string,
  query: string,
  docs: readonly SearchDoc[],
): Promise<readonly SearchHit[]> => {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, lang }),
  });
  if (!res.ok) throw new Error(`semantic: ${res.status}`);

  const body = (await res.json()) as { hits?: readonly Coordinates[] };
  const byId = new Map(docs.map((doc) => [doc.id, doc]));

  return (body.hits ?? []).flatMap((hit) => {
    const doc = byId.get(hit.doc);
    if (doc === undefined) return [];
    return [
      {
        doc,
        score: hit.score,
        snippet: passageSnippet(doc.body, hit.start, hit.end),
      },
    ];
  });
};
