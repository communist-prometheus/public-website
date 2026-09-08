import { describe, expect, it } from 'vitest';
import { articleTopicKeys } from './article-topics';

/*
 * A material's topics come from two levels. `topics` belongs to the material
 * itself and is the same in every language; `languageTopics` belongs to one
 * translation. The two ADD UP — a translation can carry an extra marker (say,
 * "our translation") on top of what the whole material is marked with — and
 * `topic` is the single-value key the content still carries from before.
 */
describe('articleTopicKeys', () => {
  it('returns nothing when the article carries no topic at all', () => {
    expect(articleTopicKeys({})).toEqual([]);
  });

  it('reads the legacy single key', () => {
    expect(articleTopicKeys({ topic: 'editorial' })).toEqual(['editorial']);
  });

  it('reads the material-level list', () => {
    expect(articleTopicKeys({ topics: ['editorial', 'primer'] })).toEqual(['editorial', 'primer']);
  });

  it('adds the translation-level list to the material-level one', () => {
    expect(articleTopicKeys({ topics: ['editorial'], languageTopics: ['translation'] })).toEqual([
      'editorial',
      'translation',
    ]);
  });

  it('keeps material topics first and never repeats a key', () => {
    expect(
      articleTopicKeys({
        topic: 'editorial',
        topics: ['editorial', 'primer'],
        languageTopics: ['primer', 'translation'],
      }),
    ).toEqual(['editorial', 'primer', 'translation']);
  });

  it('ignores blank entries rather than rendering an empty plaque', () => {
    expect(articleTopicKeys({ topics: ['editorial', '  ', ''], languageTopics: [' '] })).toEqual([
      'editorial',
    ]);
  });
});
