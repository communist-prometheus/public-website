import { describe, expect, it } from 'vitest';
import {
  editDistanceWithin,
  maxEditsFor,
  prefixDistanceWithin,
} from './distance';

describe('editDistanceWithin', () => {
  it('reports zero for identical words', () => {
    expect(editDistanceWithin('маркс', 'маркс', 2)).toBe(0);
  });

  it('counts a substitution', () => {
    expect(editDistanceWithin('маркс', 'марск', 2)).toBe(2);
  });

  it('counts a deletion', () => {
    expect(editDistanceWithin('интеллект', 'интелект', 2)).toBe(1);
  });

  it('counts an insertion', () => {
    expect(editDistanceWithin('труд', 'трудд', 2)).toBe(1);
  });

  /*
   * The bound is the whole point: the scorer runs this against every
   * unique token of every document, so a word that is obviously too far
   * away must be rejected without paying for the full matrix.
   */
  it('gives up rather than measure a distance beyond the bound', () => {
    expect(editDistanceWithin('нейросеть', 'империализм', 2)).toBeUndefined();
  });

  it('rejects on the length gap alone, before comparing a character', () => {
    expect(editDistanceWithin('ии', 'интернационализм', 2)).toBeUndefined();
  });

  it('measures across alphabets without special-casing them', () => {
    expect(editDistanceWithin('engels', 'engles', 2)).toBe(2);
  });

  it('treats an empty word as the length of the other', () => {
    expect(editDistanceWithin('', 'ии', 2)).toBe(2);
    expect(editDistanceWithin('', 'труд', 2)).toBeUndefined();
  });
});

describe('maxEditsFor', () => {
  /*
   * Typo tolerance has to scale with word length. Allowing an edit on a
   * three-letter word makes every three-letter word match every other
   * one; withholding it from a long word means a single slip hides the
   * article the reader is looking for.
   */
  it('allows no edits on a short word — everything would match everything', () => {
    expect(maxEditsFor('ии')).toBe(0);
    expect(maxEditsFor('его')).toBe(0);
  });

  it('allows one edit on a medium word', () => {
    expect(maxEditsFor('труд')).toBe(1);
    expect(maxEditsFor('маркса')).toBe(1);
  });

  it('allows two edits on a long word', () => {
    expect(maxEditsFor('интеллект')).toBe(2);
    expect(maxEditsFor('политика')).toBe(2);
  });

  /*
   * A Russian word can be off by an inflection AND a typo at once —
   * «искуственный» is four edits from «искусственного». Two would hide
   * the article from exactly the reader who cannot spell it.
   */
  it('allows three edits on a very long word', () => {
    expect(maxEditsFor('искусственный')).toBe(3);
    expect(maxEditsFor('интернационализм')).toBe(3);
  });
});

describe('prefixDistanceWithin', () => {
  /*
   * Inflection lives at the end of a Russian word and meaning at the
   * front, so the ending is allowed to diverge for free while the stem
   * still has to match.
   */
  it('reaches an inflected form the whole-word distance cannot', () => {
    expect(editDistanceWithin('искусственный', 'искусственного', 2)).toBeUndefined();
    expect(prefixDistanceWithin('искусственный', 'искусственного', 2)).toBe(2);
  });

  it('absorbs a typo and an inflection together', () => {
    expect(prefixDistanceWithin('искуственный', 'искусственного', 3)).toBe(3);
  });

  it('still requires the stem to match', () => {
    expect(prefixDistanceWithin('нейросеть', 'империализм', 3)).toBeUndefined();
  });

  /*
   * «искуственный» and «собственный» share the ending «-ственный», and a
   * budget of three is wide enough to cross the gap — edit distance cannot
   * see that the stems are unrelated. Anchoring the first two characters
   * rules it out, and costs nothing: readers mistype the middle and the
   * end of a word, almost never its opening.
   */
  it('refuses a word that only shares an ending', () => {
    expect(prefixDistanceWithin('искуственный', 'собственный', 3)).toBeUndefined();
    expect(prefixDistanceWithin('искуственный', 'искусственного', 3)).toBe(3);
  });

  it('handles a token shorter than the term', () => {
    expect(prefixDistanceWithin('нейросетями', 'нейросеть', 3)).toBe(3);
  });

  it('reports an exact prefix as zero', () => {
    expect(prefixDistanceWithin('нейросет', 'нейросетями', 2)).toBe(0);
  });
});
