import { describe, expect, it } from 'vitest';
import { getTopic } from './getTopic';

/*
 * These assertions lean on the seeded settings/topics.json
 * (editorial / translation / likbez). They cover key resolution, the
 * language fallback chain, and the tolerant handling of absent/unknown
 * keys that the article page and card rely on.
 */
describe('getTopic', () => {
  it('returns undefined for an absent key', () => {
    expect(getTopic(undefined, 'ru')).toBeUndefined();
    expect(getTopic('', 'ru')).toBeUndefined();
  });

  it('returns undefined for an unknown key', () => {
    expect(getTopic('does-not-exist', 'ru')).toBeUndefined();
  });

  it('resolves a known key to its colour and localized text', () => {
    const topic = getTopic('editorial', 'ru');
    expect(topic).toEqual({
      key: 'editorial',
      color: '#b03a2e',
      name: 'От редакции',
      subtitle: 'Собственная позиция редакции',
    });
  });

  it('falls back to the default language when the locale is missing', () => {
    const topic = getTopic('translation', 'it');
    expect(topic?.name).toBe('Translation');
    expect(topic?.subtitle).toBe('A translation of foreign material');
  });
});
