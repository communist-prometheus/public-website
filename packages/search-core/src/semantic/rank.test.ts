import { describe, expect, it } from 'vitest';
import { bestPerDoc } from './rank';

const match = (doc: string, score: number, start = 0, end = 100) => ({
  doc,
  score,
  start,
  end,
});

describe('bestPerDoc', () => {
  /*
   * The vector store answers in PASSAGES, and a long article contributes
   * dozens of them. Handing those back untouched would fill the results
   * with the same article ten times over. The reader asked about a topic,
   * not about a paragraph.
   */
  it('collapses many passages of one article into one result', () => {
    const hits = bestPerDoc([
      match('ru/blog/a', 0.7),
      match('ru/blog/a', 0.9),
      match('ru/blog/a', 0.5),
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.score).toBe(0.9);
  });

  /* The strongest passage is what the reader should be taken to. */
  it('keeps the offsets of the best passage, not the first one', () => {
    const hits = bestPerDoc([
      match('ru/blog/a', 0.4, 0, 100),
      match('ru/blog/a', 0.95, 900, 1000),
    ]);
    expect(hits[0]).toMatchObject({ start: 900, end: 1000 });
  });

  it('ranks articles by their best passage', () => {
    const hits = bestPerDoc([
      match('ru/blog/weak', 0.3),
      match('ru/blog/strong', 0.8),
      match('ru/blog/weak', 0.4),
    ]);
    expect(hits.map((h) => h.doc)).toEqual(['ru/blog/strong', 'ru/blog/weak']);
  });

  it('honours the limit', () => {
    const hits = bestPerDoc(
      Array.from({ length: 20 }, (_, i) => match(`ru/blog/${i}`, i / 20)),
      3,
    );
    expect(hits).toHaveLength(3);
  });

  it('returns nothing for nothing', () => {
    expect(bestPerDoc([])).toEqual([]);
  });
});
