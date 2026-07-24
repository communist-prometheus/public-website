import { describe, expect, it } from 'vitest';
import { resolveTopic, type TopicEntry } from './topic-resolve';

const topics: readonly TopicEntry[] = [
  {
    key: 'editorial',
    color: '#b03a2e',
    name: { en: 'Editorial', ru: 'От редакции' },
    subtitle: { en: 'The board position', ru: 'Позиция редакции' },
  },
  { key: 'translation', color: '#2563eb', name: { en: 'Translation' }, subtitle: {} },
];

describe('resolveTopic', () => {
  it('returns undefined for an absent key', () => {
    expect(resolveTopic(topics, undefined, 'ru', 'en')).toBeUndefined();
    expect(resolveTopic(topics, '', 'ru', 'en')).toBeUndefined();
  });

  it('returns undefined for an unknown key', () => {
    expect(resolveTopic(topics, 'does-not-exist', 'ru', 'en')).toBeUndefined();
  });

  it('resolves a known key to its colour and localized text', () => {
    expect(resolveTopic(topics, 'editorial', 'ru', 'en')).toEqual({
      key: 'editorial',
      color: '#b03a2e',
      name: 'От редакции',
      subtitle: 'Позиция редакции',
    });
  });

  it('falls back to the default language when the locale is missing', () => {
    const topic = resolveTopic(topics, 'translation', 'it', 'en');
    expect(topic?.name).toBe('Translation');
  });

  it('falls back to the key for a name and empty string for a subtitle', () => {
    const topic = resolveTopic(topics, 'translation', 'xx', 'zz');
    expect(topic?.name).toBe('translation');
    expect(topic?.subtitle).toBe('');
  });
});
