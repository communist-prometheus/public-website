import { describe, expect, it } from 'vitest';
import { resolveTopic, type TopicEntry } from './topic-resolve';

const topics: readonly TopicEntry[] = [
  {
    key: 'editorial',
    color: '#b03a2e',
    name: { en: 'Editorial', ru: 'От редакции' },
    subtitle: { en: 'The board position', ru: 'Позиция редакции' },
  },
  {
    key: 'translation',
    color: '#2563eb',
    name: { en: 'Translation' },
    subtitle: { en: 'Translation' },
    description: { en: 'A long editorial disclaimer about translations.' },
  },
];

describe('resolveTopic', () => {
  it('returns undefined for an absent key', () => {
    expect(resolveTopic(topics, undefined, 'ru', 'en')).toBeUndefined();
    expect(resolveTopic(topics, '', 'ru', 'en')).toBeUndefined();
  });

  it('returns undefined for an unknown key', () => {
    expect(resolveTopic(topics, 'does-not-exist', 'ru', 'en')).toBeUndefined();
  });

  it('resolves colour, name and short subtitle', () => {
    const topic = resolveTopic(topics, 'editorial', 'ru', 'en');
    expect(topic?.color).toBe('#b03a2e');
    expect(topic?.name).toBe('От редакции');
    expect(topic?.subtitle).toBe('Позиция редакции');
  });

  it('uses the long description for the banner when present', () => {
    const topic = resolveTopic(topics, 'translation', 'en', 'en');
    expect(topic?.subtitle).toBe('Translation');
    expect(topic?.description).toBe('A long editorial disclaimer about translations.');
  });

  it('falls back description to the subtitle when there is no description', () => {
    const topic = resolveTopic(topics, 'editorial', 'ru', 'en');
    expect(topic?.description).toBe('Позиция редакции');
  });

  it('falls back to the default language then the key/empty string', () => {
    const topic = resolveTopic(topics, 'translation', 'it', 'en');
    expect(topic?.name).toBe('Translation');
    expect(topic?.description).toBe('A long editorial disclaimer about translations.');
  });
});
