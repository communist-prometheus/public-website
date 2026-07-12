import { describe, expect, it } from 'vitest';
import { deriveSummary } from './deriveSummary';

describe('deriveSummary', () => {
  it('returns the first paragraph as-is when short', () => {
    expect(deriveSummary('Hello world.')).toBe('Hello world.');
  });

  it('skips heading and grabs the next paragraph', () => {
    expect(deriveSummary('# Title\n\nFirst paragraph.')).toBe('First paragraph.');
  });

  it('strips bold/italic/code marks', () => {
    expect(deriveSummary('**Bold** and _italic_ and `code` text.')).toBe(
      'Bold and italic and code text.',
    );
  });

  it('preserves link visible text, drops URL', () => {
    expect(deriveSummary('See [docs](https://x.test) for more.')).toBe('See docs for more.');
  });

  it('drops images entirely', () => {
    expect(deriveSummary('![alt](pic.png)\n\nReal text.')).toBe('Real text.');
  });

  it('truncates at MAX_LEN on a word boundary with ellipsis', () => {
    const long = 'word '.repeat(80).trim();
    const out = deriveSummary(long);
    /* MAX_LEN (320) plus the appended ellipsis. */
    expect(out?.length).toBeLessThanOrEqual(321);
    expect(out?.endsWith('…')).toBe(true);
    /* Cut on a space, never mid-word. */
    expect(out?.slice(0, -1).endsWith('word')).toBe(true);
  });

  it('returns undefined when the body has no readable text', () => {
    expect(deriveSummary('')).toBe(undefined);
    expect(deriveSummary('---\nlang: en\n---\n')).toBe(undefined);
  });
});
