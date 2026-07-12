/*
 * Bounded Levenshtein.
 *
 * The scorer runs this against every unique token of every document, so
 * the bound is not an optimisation — it is what makes the whole approach
 * affordable. Two words that are obviously far apart must be rejected
 * without paying for the full matrix, and a word whose length alone puts
 * it out of reach must be rejected before a single character is read.
 */

/** Typo budget by word length; see {@link maxEditsFor}. */
const SHORT = 3;
const MEDIUM = 6;
const LONG = 9;

/**
 * How many edits a term of this length may absorb.
 *
 * Tolerance has to scale with length. One edit on a three-letter word
 * makes every three-letter word match every other one; no edits on a
 * long word means a single slip hides the article the reader wants.
 *
 * The top tier is three, not two, because a Russian word can be off by
 * an inflection AND a typo at once: «искуственный» reaches
 * «искусственного» only across four edits, and a reader who cannot spell
 * it is exactly the reader who needs the search.
 * @param term - A normalized query word.
 * @returns Maximum edit distance that still counts as a match.
 */
export const maxEditsFor = (term: string): number => {
  if (term.length <= SHORT) return 0;
  if (term.length <= MEDIUM) return 1;
  return term.length <= LONG ? 2 : 3;
};

/**
 * Edit distance between two words, abandoned as soon as it exceeds
 * `max`.
 * @param a - First word (normalized).
 * @param b - Second word (normalized).
 * @param max - Bound; beyond it the answer is not worth computing.
 * @returns The distance, or undefined when it exceeds `max`.
 */
export const editDistanceWithin = (
  a: string,
  b: string,
  max: number,
): number | undefined => {
  if (Math.abs(a.length - b.length) > max) return undefined;
  if (a === b) return 0;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i, ...new Array<number>(b.length).fill(0)];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (row[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
      row[j] = value;
      best = Math.min(best, value);
    }
    /* Every path through this row already costs more than the bound. */
    if (best > max) return undefined;
    prev = row;
  }
  const distance = prev[b.length] ?? Number.POSITIVE_INFINITY;
  return distance > max ? undefined : distance;
};

/*
 * How many leading characters must match exactly before a fuzzy match is
 * even considered.
 *
 * Without an anchor, a budget of three lets «искуственный» reach
 * «собственный» — they share the ending «-ственный», and edit distance
 * cannot see that the stems have nothing to do with each other. Readers
 * mistype the middle and the end of a word, almost never its first two
 * letters, so anchoring there costs recall nothing and buys back the
 * precision the wide budget spends. Search engines call this
 * `prefix_length`.
 */
const ANCHOR = 2;

/**
 * Distance from a term to the closest PREFIX of a token.
 *
 * Inflection is why this exists. Russian carries the meaning at the front
 * of a word and the grammar at the back, so «искусственный» and
 * «искусственного» are the same word wearing a different ending — but
 * measured whole they are three edits apart, and with a typo on top the
 * reader's spelling never reaches the article's. Comparing the term
 * against the token's prefixes lets the ending diverge for free while the
 * stem still has to match.
 *
 * The token being shorter than the term is handled by the plain distance
 * (the full token is one of the prefixes considered).
 * @param term - A normalized query word.
 * @param token - A normalized word from the document.
 * @param max - Edit budget.
 * @returns The best distance within budget, or undefined.
 */
export const prefixDistanceWithin = (
  term: string,
  token: string,
  max: number,
): number | undefined => {
  const anchor = Math.min(ANCHOR, term.length);
  if (token.slice(0, anchor) !== term.slice(0, anchor)) return undefined;
  const shortest = Math.max(1, term.length - max);
  const longest = Math.min(token.length, term.length + max);
  let best: number | undefined;
  for (let length = shortest; length <= longest; length += 1) {
    const distance = editDistanceWithin(term, token.slice(0, length), max);
    if (distance === undefined) continue;
    if (distance === 0) return 0;
    best = best === undefined ? distance : Math.min(best, distance);
  }
  return best;
};
