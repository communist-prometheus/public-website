import type { SearchDoc } from '@prometheus/search-core';
import { describe, expect, it } from 'vitest';
import type { Env } from './env';
import { handleReindex } from './reindex';

const SECRET = 'test-reindex-secret';

const doc = (n: number): SearchDoc => ({
  id: `ru/blog/article-${n}`,
  lang: 'ru',
  section: 'blog',
  slug: `article-${n}`,
  url: `https://comprom.org/ru/blog/article-${n}`,
  title: `Title ${n}`,
  description: `Description ${n}`,
  body: `Body ${n}`,
  hash: `hash-${n}`,
});

/** An ASSETS stub that serves the search index for the requested language. */
const assetsServing = (docs: readonly SearchDoc[]): Env['ASSETS'] =>
  ({
    fetch: async (): Promise<Response> => new Response(JSON.stringify({ docs }), { status: 200 }),
  }) as unknown as Env['ASSETS'];

/*
 * A Vectorize stub enforcing the real `getByIds` cap: the live index
 * answers more than 20 ids with HTTP 400, code 40007. Recording each
 * call's size lets a test prove the lookup was split under the cap.
 */
const vectorizeCappedAt20 = (sizes: number[]): Env['VECTORIZE'] =>
  ({
    getByIds: async (ids: readonly string[]): Promise<readonly never[]> => {
      sizes.push(ids.length);
      if (ids.length > 20) {
        throw new Error(`too many ids in payload; max id count is 20, got ${ids.length}`);
      }
      return [];
    },
  }) as unknown as Env['VECTORIZE'];

const planRequest = (): Request =>
  new Request('https://dev.comprom.org/api/reindex', {
    method: 'POST',
    headers: { 'X-Reindex-Key': SECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang: 'ru' }),
  });

const envWith = (docs: readonly SearchDoc[], sizes: number[]): Env =>
  ({
    REINDEX_SECRET: SECRET,
    ASSETS: assetsServing(docs),
    VECTORIZE: vectorizeCappedAt20(sizes),
  }) as unknown as Env;

describe('handleReindex — plan lookup batching', () => {
  it('splits the id lookup so no call exceeds the 20-id cap (ru has 22)', async () => {
    const sizes: number[] = [];
    const docs = Array.from({ length: 22 }, (_, i) => doc(i));

    const res = await handleReindex(planRequest(), envWith(docs, sizes));

    expect(res.status).toBe(200);
    expect(sizes).toEqual([20, 2]);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(20);
  });

  it('plans every document as stale when the index holds no heads', async () => {
    const sizes: number[] = [];
    const docs = Array.from({ length: 22 }, (_, i) => doc(i));

    const res = await handleReindex(planRequest(), envWith(docs, sizes));
    const body = (await res.json()) as { stale: readonly string[] };

    expect(body.stale).toHaveLength(22);
  });
});
