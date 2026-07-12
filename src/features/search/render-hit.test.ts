import type { SearchHit } from '@prometheus/search-core';
import { describe, expect, it } from 'vitest';
import { snippetParts } from './render-hit';

const hit = (text: string, marks: readonly { start: number; end: number }[]): SearchHit =>
  ({
    doc: {
      id: 'ru/blog/x',
      lang: 'ru',
      section: 'blog',
      slug: 'x',
      url: '/ru/blog/x',
      title: 't',
      description: '',
      body: '',
      hash: '00000000',
    },
    score: 1,
    snippet: { text, marks },
  }) satisfies SearchHit;

describe('snippetParts', () => {
  it('splits the snippet around a match', () => {
    expect(snippetParts(hit('про нейросети тут', [{ start: 4, end: 13 }]))).toEqual([
      { text: 'про ', marked: false },
      { text: 'нейросети', marked: true },
      { text: ' тут', marked: false },
    ]);
  });

  it('marks a match at the very start', () => {
    expect(snippetParts(hit('маркс писал', [{ start: 0, end: 5 }]))).toEqual([
      { text: 'маркс', marked: true },
      { text: ' писал', marked: false },
    ]);
  });

  it('merges overlapping ranges rather than repeating characters', () => {
    const parts = snippetParts(
      hit('нейросети', [
        { start: 0, end: 5 },
        { start: 3, end: 9 },
      ]),
    );
    expect(parts.map((p) => p.text).join('')).toBe('нейросети');
    expect(parts).toHaveLength(1);
    expect(parts[0]?.marked).toBe(true);
  });

  it('rebuilds the snippet exactly — no character is lost or doubled', () => {
    const text = 'слово другое третье';
    const parts = snippetParts(
      hit(text, [
        { start: 0, end: 5 },
        { start: 13, end: 19 },
      ]),
    );
    expect(parts.map((p) => p.text).join('')).toBe(text);
  });

  /*
   * The reason the scorer returns ranges instead of HTML: the caller sets
   * `textContent` on each part, so a body carrying an <img onerror> tag
   * comes back as characters, never as markup.
   */
  it('leaves markup in the content as inert text', () => {
    const parts = snippetParts(hit('<img src=x onerror=alert(1)>', []));
    expect(parts).toEqual([{ text: '<img src=x onerror=alert(1)>', marked: false }]);
  });

  it('handles a snippet with no matches', () => {
    expect(snippetParts(hit('без совпадений', []))).toEqual([
      { text: 'без совпадений', marked: false },
    ]);
  });
});
