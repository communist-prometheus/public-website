import { describe, expect, it } from 'vitest';
import { type IssueArticles, issueRef, resolveIssueSlug } from './resolveArticleIssue';

const ISSUES: readonly IssueArticles[] = [
  {
    id: 'vypusk-14/index.en.md',
    data: { articles: ['worker-solidarity', 'weekly-chronicle'] },
  },
  { id: 'vypusk-14/index.ru.md', data: {} },
  { id: 'vypusk-13/index.en.md', data: { articles: ['old-news'] } },
];

describe('resolveIssueSlug', () => {
  it('prefers the article own issue field', () => {
    expect(resolveIssueSlug(ISSUES, 'anything', 'vypusk-13')).toBe('vypusk-13');
  });

  it('reverse-looks-up the issue when no issue field is set', () => {
    expect(resolveIssueSlug(ISSUES, 'weekly-chronicle')).toBe('vypusk-14');
  });

  it('derives the bare slug from a sub-path issue id', () => {
    expect(resolveIssueSlug(ISSUES, 'old-news')).toBe('vypusk-13');
  });

  it('returns undefined when no issue references the article', () => {
    expect(resolveIssueSlug(ISSUES, 'orphan-article')).toBeUndefined();
  });
});

describe('issueRef', () => {
  it('reads the canonical magazine field', () => {
    expect(issueRef({ magazine: 'vypusk-14' })).toBe('vypusk-14');
  });

  it('falls back to the legacy newspaper field', () => {
    expect(issueRef({ newspaper: 'vypusk-13' })).toBe('vypusk-13');
  });

  it('prefers magazine when a file carries both keys mid-migration', () => {
    expect(issueRef({ magazine: 'vypusk-14', newspaper: 'vypusk-13' })).toBe('vypusk-14');
  });

  it('returns undefined when the article belongs to no issue', () => {
    expect(issueRef({})).toBeUndefined();
  });
});
