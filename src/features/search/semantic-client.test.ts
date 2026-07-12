import type { SearchDoc } from '@prometheus/search-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { semanticSearch } from './semantic-client';

const doc = (id: string, body: string): SearchDoc => ({
  id,
  lang: 'ru',
  section: 'blog',
  slug: id,
  url: `/ru/blog/${id}`,
  title: id,
  description: '',
  body,
  hash: '0',
});

const reply = (hits: unknown): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ hits }), { status: 200 })),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('semanticSearch', () => {
  it('quotes the passage the server pointed at, from the local body', async () => {
    reply([{ doc: 'a', score: 0.8, start: 6, end: 16 }]);
    const hits = await semanticSearch('ru', 'нейросети', [doc('a', 'alpha beta gamma delta')]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.snippet.text).toBe('beta gamma');
    expect(hits[0]?.score).toBe(0.8);
  });

  it('drops an id the local index does not know — the deploy is the truth', async () => {
    reply([
      { doc: 'deleted', score: 0.9, start: 0, end: 5 },
      { doc: 'a', score: 0.4, start: 0, end: 5 },
    ]);
    const hits = await semanticSearch('ru', 'q', [doc('a', 'alpha')]);
    expect(hits.map((hit) => hit.doc.id)).toEqual(['a']);
  });

  it('sends only the query — never the corpus', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ hits: [] }), { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await semanticSearch('ru', 'нейросети', [doc('a', 'x'.repeat(50_000))]);
    const [, init] = spy.mock.calls[0] ?? [];
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      q: 'нейросети',
      lang: 'ru',
    });
  });

  it('throws when the Worker refuses, so the caller can say so', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 429 })),
    );
    await expect(semanticSearch('ru', 'q', [])).rejects.toThrow('429');
  });
});
