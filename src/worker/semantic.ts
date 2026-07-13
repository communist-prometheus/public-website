import type { PassageMatch } from '@prometheus/search-core';
import { bestPerDoc } from '@prometheus/search-core';
import { embed } from './embed';
import { type Env, json } from './env';

/*
 * Answer a semantic query.
 *
 * The reply carries document ids and CHARACTER OFFSETS — never text. The
 * browser already holds the whole index, so it can render the title, the
 * URL and the quoted passage itself. That is what keeps this endpoint
 * cheap: a query goes out, a handful of coordinates come back.
 *
 * The browser also drops any id it does not know. That is not defensive
 * padding — it is how a deleted article stops appearing: the vector store
 * cannot be enumerated cheaply, so the client, which knows exactly what
 * exists, is the authority on what may be shown.
 */

/*
 * Long enough for a real question, short enough that nobody can post an
 * article body and make us embed it.
 */
const MAX_QUERY = 200;

/*
 * Passages, not documents: one article can own many, so ask for plenty
 * and let `bestPerDoc` collapse them.
 */
const TOP_PASSAGES = 40;
const TOP_DOCS = 10;

interface Body {
  readonly q?: unknown;
  readonly lang?: unknown;
}

/** What we wrote into a vector's metadata at index time — as it comes back. */
interface VectorMetadata {
  readonly doc?: unknown;
  readonly start?: unknown;
  readonly end?: unknown;
}

interface VectorMatch {
  readonly score: number;
  readonly metadata?: VectorMetadata | undefined;
}

const asPassage = (match: VectorMatch): readonly PassageMatch[] => {
  const { doc, start, end } = match.metadata ?? {};
  if (typeof doc !== 'string') return [];
  return [
    {
      doc,
      score: match.score,
      start: typeof start === 'number' ? start : 0,
      end: typeof end === 'number' ? end : 0,
    },
  ];
};

/**
 * `POST /api/semantic` — find articles by meaning.
 * @param request Incoming request.
 * @param env Worker bindings.
 * @returns Document ids, scores and passage offsets.
 */
export const handleSemantic = async (request: Request, env: Env): Promise<Response> => {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'anonymous';
  const { success } = await env.SEMANTIC_LIMIT.limit({ key: ip });
  if (!success) return json({ error: 'rate_limited' }, 429);

  const body = (await request.json().catch(() => undefined)) as Body | undefined;
  const q = typeof body?.q === 'string' ? body.q.trim() : '';
  const lang = typeof body?.lang === 'string' ? body.lang : '';
  if (q === '' || lang === '') return json({ error: 'query' }, 400);
  if (q.length > MAX_QUERY) return json({ error: 'too_long' }, 413);

  const [vector] = await embed(env, [q]);
  if (vector === undefined) return json({ error: 'embedding' }, 502);

  const result = await env.VECTORIZE.query([...vector], {
    topK: TOP_PASSAGES,
    filter: { lang },
    returnMetadata: 'all',
  });

  const passages = (result.matches ?? []).flatMap((m) => asPassage(m as VectorMatch));
  return json({ hits: bestPerDoc(passages, TOP_DOCS) });
};
