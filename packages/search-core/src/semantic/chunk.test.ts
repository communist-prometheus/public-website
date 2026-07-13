import { describe, expect, it } from 'vitest';
import { chunkBody } from './chunk';

const words = (count: number, word = 'слово'): string =>
  Array.from({ length: count }, () => word).join(' ');

describe('chunkBody', () => {
  /*
   * Articles here run to 72 000 characters. Embedding one as a single
   * vector averages the whole thing into something that is about nothing
   * — the passage is the unit of meaning, not the article.
   */
  it('splits a long body into passages', () => {
    const chunks = chunkBody(words(2000));
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(1200);
    }
  });

  it('keeps a short body whole', () => {
    const chunks = chunkBody('Пролетарии всех стран, соединяйтесь.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe('Пролетарии всех стран, соединяйтесь.');
  });

  it('returns nothing for an empty body', () => {
    expect(chunkBody('')).toEqual([]);
    expect(chunkBody('   ')).toEqual([]);
  });

  /*
   * The offsets are what let the reader see WHERE in the article the
   * match is: the browser already holds the body, so the server sends
   * coordinates instead of text.
   */
  it('reports offsets that point back into the source', () => {
    const body = words(600);
    for (const chunk of chunkBody(body)) {
      expect(body.slice(chunk.start, chunk.end)).toBe(chunk.text);
    }
  });

  it('never cuts a word in half', () => {
    const body = words(600);
    for (const chunk of chunkBody(body)) {
      expect(chunk.text.startsWith(' ')).toBe(false);
      expect(chunk.text.endsWith(' ')).toBe(false);
      expect(body[chunk.start - 1] ?? ' ').toBe(' ');
    }
  });

  /*
   * A sentence that straddles a boundary would otherwise be in neither
   * passage — the overlap is what stops the answer falling into the gap.
   */
  it('overlaps consecutive passages', () => {
    const chunks = chunkBody(words(600));
    expect(chunks.length).toBeGreaterThan(1);
    const [first, second] = chunks;
    expect(second?.start).toBeLessThan(first?.end ?? 0);
  });

  it('covers the whole body — no passage of text is unreachable', () => {
    const body = words(900, 'текст');
    const chunks = chunkBody(body);
    expect(chunks[0]?.start).toBe(0);
    expect(chunks.at(-1)?.end).toBe(body.length);
  });

  it('always makes progress, even when a single word is longer than a chunk', () => {
    const monster = 'а'.repeat(5000);
    const chunks = chunkBody(monster);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.at(-1)?.end).toBe(monster.length);
  });
});
