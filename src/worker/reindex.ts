import type { SearchDoc } from '@prometheus/search-core';
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
 */

/*
 * An article here can be 72 000 characters — about 90 passages. Two per
 * request keeps a single call well inside the Worker's limits; the caller
 * loops until `remaining` reaches zero.
 */
const DOCS_PER_CALL = 2;

interface Body {
  readonly lang?: unknown;
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

const headOf = async (env: Env, docId: string): Promise<Head | undefined> => {
  const found = await env.VECTORIZE.getByIds([chunkId(docId, 0)]);
  const { hash, chunks } = (found.at(0)?.metadata ?? {}) as Partial<Record<keyof Head, unknown>>;
  if (typeof hash !== 'string' || typeof chunks !== 'number') return undefined;
  return { hash, chunks };
};

const indexDoc = async (env: Env, doc: SearchDoc): Promise<void> => {
  const head = await headOf(env, doc.id);
  if (head !== undefined && head.hash === doc.hash) return;

  const chunks = chunkBody(doc.body);
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

/**
 * `POST /api/reindex` — re-embed the documents whose content changed.
 *
 * Guarded by a shared secret and driven by CI after a deploy. Processes a
 * bounded batch and reports what is left, so the caller loops rather than
 * asking one request to embed the whole site.
 * @param request Incoming request.
 * @param env Worker bindings.
 * @returns How many documents were re-embedded, and how many remain.
 */
export const handleReindex = async (request: Request, env: Env): Promise<Response> => {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const secret = env.REINDEX_SECRET;
  if (!secret || request.headers.get('X-Reindex-Key') !== secret) {
    return json({ error: 'forbidden' }, 403);
  }

  const body = (await request.json().catch(() => undefined)) as Body | undefined;
  const lang = typeof body?.lang === 'string' ? body.lang : '';
  if (lang === '') return json({ error: 'lang' }, 400);

  const docs = await loadIndex(env, lang);

  const stale: SearchDoc[] = [];
  for (const doc of docs) {
    const head = await headOf(env, doc.id);
    if (head === undefined || head.hash !== doc.hash) stale.push(doc);
  }

  const batch = stale.slice(0, DOCS_PER_CALL);
  for (const doc of batch) await indexDoc(env, doc);

  return json({
    lang,
    total: docs.length,
    indexed: batch.length,
    remaining: stale.length - batch.length,
  });
};
