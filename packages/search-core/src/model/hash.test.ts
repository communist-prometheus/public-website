import { describe, expect, it } from 'vitest';
import { contentHash } from './hash';

describe('contentHash', () => {
  /*
   * The semantic pass re-embeds a document only when its hash moves. So
   * the hash has to be stable across builds and processes — anything
   * seeded by time, iteration order or a random salt would re-embed the
   * entire site on every deploy.
   */
  it('is stable for the same content', () => {
    expect(contentHash('a', 'b', 'c')).toBe(contentHash('a', 'b', 'c'));
  });

  it('moves when any part of the content moves', () => {
    const base = contentHash('title', 'description', 'body');
    expect(contentHash('title!', 'description', 'body')).not.toBe(base);
    expect(contentHash('title', 'description!', 'body')).not.toBe(base);
    expect(contentHash('title', 'description', 'body!')).not.toBe(base);
  });

  /* Otherwise moving a word from the title to the body would look unchanged. */
  it('does not confuse a field boundary with content', () => {
    expect(contentHash('ab', '', '')).not.toBe(contentHash('a', 'b', ''));
  });

  it('is a short hex string', () => {
    expect(contentHash('a', 'b', 'c')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('handles an empty document', () => {
    expect(contentHash('', '', '')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('handles Cyrillic and emoji without collapsing them', () => {
    expect(contentHash('Маркс', '', '')).not.toBe(contentHash('Энгельс', '', ''));
  });
});
