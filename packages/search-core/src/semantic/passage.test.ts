import { describe, expect, it } from 'vitest';
import { passageSnippet } from './passage';

describe('passageSnippet', () => {
  it('quotes the passage the coordinates point at', () => {
    const body = 'alpha beta gamma delta';
    expect(passageSnippet(body, 6, 16).text).toBe('beta gamma');
  });

  it('never highlights: a semantic hit matched no word the reader typed', () => {
    expect(passageSnippet('alpha beta', 0, 10).marks).toEqual([]);
  });

  it('reads offsets against the trimmed body, as the chunker wrote them', () => {
    expect(passageSnippet('\n\n  alpha beta', 0, 5).text).toBe('alpha');
  });

  it('cuts a long passage on a word boundary and marks the cut', () => {
    const body = 'слово '.repeat(100).trim();
    const { text } = passageSnippet(body, 0, body.length);
    expect(text.endsWith('…')).toBe(true);
    expect(text).not.toContain('слов…');
    expect(text.length).toBeLessThanOrEqual(241);
  });

  it('clamps coordinates that outrun the body', () => {
    expect(passageSnippet('alpha', 2, 900).text).toBe('pha');
  });

  it('falls back to the head of the body when the range is empty', () => {
    expect(passageSnippet('alpha beta', 4, 4).text).toBe('alpha beta');
  });
});
