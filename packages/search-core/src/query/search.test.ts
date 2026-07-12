import { describe, expect, it } from 'vitest';
import type { SearchDoc, SearchIndex } from '../model/doc';
import { prepare, search } from './search';

const doc = (over: Partial<SearchDoc> & Pick<SearchDoc, 'slug'>): SearchDoc => ({
  id: `ru/blog/${over.slug}`,
  lang: 'ru',
  section: 'blog',
  url: `/ru/blog/${over.slug}`,
  title: '',
  description: '',
  body: '',
  hash: '00000000',
  ...over,
});

const index = (docs: readonly SearchDoc[]): SearchIndex => ({ lang: 'ru', docs });

const CYBER = doc({
  slug: 'cyber-tool',
  title: 'Орудие труда и кибернетический мастерок',
  description: 'О месте нейросетей в производстве.',
  body: 'Современные нейросети созданы корпорациями ради прибыли.',
});

const REVIEW = doc({
  slug: 'international-review',
  title: 'Международный обзор: апрель 2026',
  description: 'Обзор мировой экономики.',
  body: 'Развитие искусственного интеллекта и зелёной энергетики.',
});

const MANIFESTO = doc({
  slug: 'manifesto',
  title: 'Манифест',
  description: 'Программные положения.',
  body: 'Пролетарии всех стран, соединяйтесь.',
});

const ALL = index([CYBER, REVIEW, MANIFESTO]);

const slugs = (query: string, from: SearchIndex = ALL): readonly string[] =>
  search(prepare(from), query).map(hit => hit.doc.slug);

describe('search', () => {
  it('finds a document by a word in its body', () => {
    expect(slugs('корпорациями')).toEqual(['cyber-tool']);
  });

  it('finds a document by a word in its title', () => {
    expect(slugs('мастерок')).toEqual(['cyber-tool']);
  });

  /*
   * The whole reason for the feature: a reader who cannot spell
   * "искусственный интеллект" must still land on the article about it.
   */
  it('survives typos', () => {
    expect(slugs('искуственный интелект')).toEqual(['international-review']);
    expect(slugs('нейросиети')).toEqual(['cyber-tool']);
  });

  it('does not fuzz a short word into everything', () => {
    expect(slugs('оба')).toEqual([]);
  });

  /* AND, not OR: every term has to land somewhere, or the doc is out. */
  it('requires every term to match', () => {
    expect(slugs('нейросети прибыли')).toEqual(['cyber-tool']);
    expect(slugs('нейросети империализм')).toEqual([]);
  });

  it('ranks a title match above a body-only match', () => {
    const titled = doc({ slug: 'titled', title: 'Энергетика' });
    const buried = doc({ slug: 'buried', body: 'много слов про энергетику и ещё' });
    expect(slugs('энергетика', index([buried, titled]))).toEqual([
      'titled',
      'buried',
    ]);
  });

  it('ranks an exact match above a fuzzy one', () => {
    const exact = doc({ slug: 'exact', title: 'нейросеть' });
    const typo = doc({ slug: 'typo', title: 'нейросети' });
    const [first] = slugs('нейросеть', index([typo, exact]));
    expect(first).toBe('exact');
  });

  it('returns nothing for a blank query rather than everything', () => {
    expect(slugs('')).toEqual([]);
    expect(slugs('   ')).toEqual([]);
  });

  it('matches across the ё/е split', () => {
    expect(slugs('зелёной')).toEqual(['international-review']);
    expect(slugs('зеленой')).toEqual(['international-review']);
  });

  it('honours the result limit', () => {
    const many = index(
      Array.from({ length: 30 }, (_, i) =>
        doc({ slug: `s${i}`, title: 'нейросеть' }),
      ),
    );
    expect(search(prepare(many), 'нейросеть', 5)).toHaveLength(5);
  });
});

describe('search — snippets', () => {
  /*
   * The fold collapses a run of punctuation into one space, so an offset
   * in the folded text means nothing in the source. Assuming otherwise
   * put the highlight on whatever happened to sit at the same index — the
   * reader saw a random half-word marked. The mark must cover the word
   * that was searched for, and nothing else.
   */
  it('marks the searched word itself, not whatever sits at the same offset', () => {
    const punctuated = doc({
      slug: 'punctuated',
      body: 'Итак, — вот, наконец: нейросети, товарищи!',
    });
    const hit = search(prepare(index([punctuated])), 'нейросети')[0];
    const marks = hit?.snippet.marks ?? [];
    expect(marks).toHaveLength(1);
    const [mark] = marks;
    expect(hit?.snippet.text.slice(mark?.start, mark?.end)).toBe('нейросети');
  });

  it('marks through case and ё, quoting the source spelling', () => {
    const cased = doc({ slug: 'cased', body: 'Здесь НЕЙРОСЁТИ важны.' });
    const hit = search(prepare(index([cased])), 'нейросети')[0];
    const [mark] = hit?.snippet.marks ?? [];
    expect(hit?.snippet.text.slice(mark?.start, mark?.end)).toBe('НЕЙРОСЁТИ');
  });

  /*
   * A misspelled term is not in the document at all, so there is nothing
   * to mark literally. Show the reader the word they meant, spelled the
   * way the article spells it.
   */
  it('marks the word the reader meant when they misspelled it', () => {
    const hit = search(prepare(ALL), 'нейросиети')[0];
    const [mark] = hit?.snippet.marks ?? [];
    expect(hit?.snippet.text.slice(mark?.start, mark?.end)?.toLowerCase()).toContain(
      'нейросет',
    );
  });

  it('quotes the body around the match, not from the top', () => {
    const hit = search(prepare(ALL), 'корпорациями')[0];
    expect(hit?.snippet.text).toContain('корпорациями');
  });

  /*
   * Ranges, not HTML. The renderer escapes the text and wraps the ranges
   * itself, so a body containing `<img onerror=…>` can never reach the
   * DOM as markup.
   */
  it('reports highlight ranges rather than emitting markup', () => {
    const hit = search(prepare(ALL), 'корпорациями')[0];
    const marks = hit?.snippet.marks ?? [];
    expect(marks.length).toBeGreaterThan(0);
    const [first] = marks;
    const quoted = hit?.snippet.text.slice(first?.start, first?.end);
    expect(quoted?.toLowerCase()).toContain('корпорациями');
    expect(hit?.snippet.text).not.toContain('<');
  });

  it('falls back to the description when the match is in the title', () => {
    const hit = search(prepare(ALL), 'мастерок')[0];
    expect(hit?.snippet.text.length).toBeGreaterThan(0);
  });
});
