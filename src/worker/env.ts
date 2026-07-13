import type { Ai, Fetcher, RateLimit, Vectorize } from '@cloudflare/workers-types';

/** Bindings this Worker runs on. See `wrangler.jsonc`. */
export interface Env {
  /** The static site. Everything that is not `/api/*` is served from here. */
  readonly ASSETS: Fetcher;
  readonly AI: Ai;
  /*
   * `Vectorize`, not `VectorizeIndex`: the latter is the beta class, whose
   * mutations were synchronous. The index here is a v2 one.
   */
  readonly VECTORIZE: Vectorize;
  readonly SEMANTIC_LIMIT: RateLimit;
  /** Shared with the CI job that rebuilds the vectors after a deploy. */
  readonly REINDEX_SECRET?: string;
}

/**
 * The embedding model.
 *
 * Multilingual on purpose, and in ONE vector space: the site publishes the
 * same argument in Russian, English, Italian and Spanish, and a reader who
 * asks in one language should be able to reach it in another. A per-language
 * model would make that impossible by construction.
 */
export const EMBEDDING_MODEL = '@cf/baai/bge-m3';

/** Reply as JSON, with no cache — an answer is per-query. */
export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
