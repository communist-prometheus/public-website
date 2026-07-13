import type { Chunk, SearchDoc } from '@prometheus/search-core';
import { chunkBody } from '@prometheus/search-core';
import { embed } from './embed';
import { type Env, json } from './env';

/*
 * Rebuild the vectors — but only for what actually changed.
 *
 * Every document in the index carries a content hash. Chunk 0 of a
 * document keeps that hash in its metadata, so the vector store itself
 * remembers what it was built from: no second database, no bookkeeping to
 * fall out of sync. A publish that touches one article re-embeds one
 * article, not the site.
 *
 * The Worker reads the index through the ASSETS binding — the same file
 * the browser downloads, from the deploy that is already live — so there
 * is no separate content pipeline to drift from what readers see.
 *
 * Two shapes, and the split matters:
 *
 *   { lang }             → PLAN: which documents are stale
 *   { lang, docs: [id] } → INDEX exactly these, no questions asked
 *
 * Vectorize is eventually consistent: for a few seconds after an upsert,
 * `getByIds` still answers with what was there before. Re-planning after
 * every batch therefore keeps handing back documents that were just done,
 * and the job re-embeds them in a circle. So the plan is drawn ONCE, by
 * the caller, and the batches that follow name their documents.
 */

/*
 * An article here can be 72 000 characters — about 90 passages, five model
 * calls. Two documents a request keeps a single call well inside the
 * Worker's budget; the caller walks the plan.
 */
const MAX_DOCS_PER_CALL = 2;

/* Vectorize takes at most 100 ids in one lookup. */
const LOOKUP_LIMIT = 100;

interface Body {
  readonly lang?: unknown;
  readonly docs?: unknown;
}

const chunkId = (docId: string, at: number): string => `${docId}#${at}`;

/*
 * Chunk 0 carries the hash AND the chunk count, so a document that shrank
 * can have its leftovers deleted before the new ones go in. Without the
 * count, stale passages would linger and keep matching.
 */
interface Head {
  readonly hash: string;
  readonly chunks: number;
}

const headsOf = async (
  env: Env,
  docs: readonly SearchDoc[],
): Promise<ReadonlyMap<string, Head>> => {
  const found = new Map<string, Head>();
  for (let at = 0; at < docs.length; at += LOOKUP_LIMIT) {
    const batch = docs.slice(at, at + LOOKUP_LIMIT);
    const vectors = await env.VECTORIZE.getByIds(batch.map((doc) => chunkId(doc.id, 0)));
    for (const vector of vectors) {
      const { hash, chunks } = (vector.metadata ?? {}) as Partial<Record<keyof Head, unknown>>;
      if (typeof hash === 'string' && typeof chunks === 'number') {
        found.set(vector.id, { hash, chunks });
      }
    }
  }
  return found;
};

/*
 * A magazine issue is a cover, a title and a blurb — its body is empty.
 * Skipping it would leave it forever unindexed AND forever "stale", since
 * the hash lives in chunk 0 and there would be no chunk 0 to hold it: it
 * would be re-planned on every deploy, for ever, and never done. It also
 * has a subject a reader can ask for. One passage, from what it does have.
 */
const passagesOf = (doc: SearchDoc): readonly Chunk[] => {
  const chunks = chunkBody(doc.body);
  if (chunks.length > 0) return chunks;
  const text = `${doc.title}. ${doc.description}`.trim();
  return text === '' ? [] : [{ text, start: 0, end: 0 }];
};

const indexDoc = async (env: Env, doc: SearchDoc, head?: Head): Promise<void> => {
  const chunks = passagesOf(doc);
  if (chunks.length === 0) return;

  /*
   * The title and description carry the article's subject more plainly
   * than any single paragraph does — prepend them to the first passage so
   * a query about the subject can land on it.
   */
  const texts = chunks.map((chunk, at) =>
    at === 0 ? `${doc.title}. ${doc.description} ${chunk.text}` : chunk.text,
  );
  const vectors = await embed(env, texts);

  if (head !== undefined && head.chunks > chunks.length) {
    const stale = Array.from({ length: head.chunks - chunks.length }, (_, i) =>
      chunkId(doc.id, chunks.length + i),
    );
    await env.VECTORIZE.deleteByIds(stale);
  }

  await env.VECTORIZE.upsert(
    chunks.map((chunk, at) => ({
      id: chunkId(doc.id, at),
      values: [...(vectors[at] ?? [])],
      metadata: {
        doc: doc.id,
        lang: doc.lang,
        start: chunk.start,
        end: chunk.end,
        ...(at === 0 ? { hash: doc.hash, chunks: chunks.length } : {}),
      },
    })),
  );
};

const loadIndex = async (env: Env, lang: string): Promise<readonly SearchDoc[]> => {
  const res = await env.ASSETS.fetch(
    new Request(`https://assets.invalid/${lang}/search-index.json`),
  );
  if (!res.ok) return [];
  const body = (await res.json()) as { docs?: readonly SearchDoc[] };
  return body.docs ?? [];
};

const wanted = (body: Body): readonly string[] | undefined =>
  Array.isArray(body.docs)
    ? body.docs.filter((id): id is string => typeof id === 'string')
    : undefined;

const plan = async (env: Env, lang: string, docs: readonly SearchDoc[]): Promise<Response> => {
  const heads = await headsOf(env, docs);
  const stale = docs
    .filter((doc) => heads.get(chunkId(doc.id, 0))?.hash !== doc.hash)
    .map((doc) => doc.id);
  return json({ lang, total: docs.length, stale });
};

const indexBatch = async (
  env: Env,
  lang: string,
  docs: readonly SearchDoc[],
  ids: readonly string[],
): Promise<Response> => {
  const batch = docs.filter((doc) => ids.includes(doc.id)).slice(0, MAX_DOCS_PER_CALL);
  const heads = await headsOf(env, batch);
  for (const doc of batch) {
    await indexDoc(env, doc, heads.get(chunkId(doc.id, 0)));
  }
  return json({ lang, indexed: batch.map((doc) => doc.id) });
};

/**
 * `POST /api/reindex` — plan, or re-embed a named batch.
 *
 * Guarded by a shared secret and driven by CI after a deploy.
 * @param request Incoming request.
 * @param env Worker bindings.
 * @returns The stale list, or what this call embedded.
 */
export const handleReindex = async (request: Request, env: Env): Promise<Response> => {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const secret = env.REINDEX_SECRET;
  if (!secret || request.headers.get('X-Reindex-Key') !== secret) {
    return json({ error: 'forbidden' }, 403);
  }

  const body = ((await request.json().catch(() => undefined)) ?? {}) as Body;
  const lang = typeof body.lang === 'string' ? body.lang : '';
  if (lang === '') return json({ error: 'lang' }, 400);

  const docs = await loadIndex(env, lang);
  const ids = wanted(body);
  return ids === undefined ? plan(env, lang, docs) : indexBatch(env, lang, docs, ids);
};
