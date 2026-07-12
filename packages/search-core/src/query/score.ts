import type { PreparedDoc } from './prepared';
import { maxEditsFor, prefixDistanceWithin } from './distance';

/*
 * A title match means the article is ABOUT the term; a body match means
 * it merely says the word. The weights say so, and the gap has to be
 * wide enough that no amount of repetition in a body outranks a title.
 */
const TITLE = 10;
const DESCRIPTION = 4;
const BODY = 2;

/* A fuzzy hit is a guess. It must never outrank something spelled right. */
const FUZZY_PENALTY = 0.4;

const fieldScore = (field: string, term: string, weight: number): number => {
  const at = field.indexOf(term);
  if (at < 0) return 0;
  /* A whole-word hit beats a hit buried inside a longer word. */
  const before = at === 0 ? ' ' : field[at - 1];
  const after = field[at + term.length] ?? ' ';
  const whole = before === ' ' && after === ' ';
  return whole ? weight : weight * 0.6;
};

const exactScore = (doc: PreparedDoc, term: string): number =>
  fieldScore(doc.title, term, TITLE) +
  fieldScore(doc.description, term, DESCRIPTION) +
  fieldScore(doc.body, term, BODY);

/*
 * Only reached when the term appears nowhere verbatim — so this walks the
 * document's unique tokens, not its text, and each comparison is
 * abandoned the moment it exceeds the budget.
 *
 * Prefix distance, not whole-word: a Russian word carries its meaning at
 * the front and its grammar at the back, so the ending has to be allowed
 * to diverge while the stem still has to match.
 */
const fuzzyScore = (doc: PreparedDoc, term: string): number => {
  const budget = maxEditsFor(term);
  if (budget === 0) return 0;
  let best = 0;
  for (const token of doc.tokens) {
    const distance = prefixDistanceWithin(term, token, budget);
    if (distance === undefined) continue;
    const closeness = 1 - distance / (budget + 1);
    best = Math.max(best, closeness);
    if (distance === 0) break;
  }
  return best * BODY * FUZZY_PENALTY;
};

/**
 * Score one document against one query term.
 * @param doc - A prepared document.
 * @param term - A normalized query word.
 * @returns Score, or 0 when the term is absent — which drops the document.
 */
export const scoreTerm = (doc: PreparedDoc, term: string): number => {
  const exact = exactScore(doc, term);
  return exact > 0 ? exact : fuzzyScore(doc, term);
};

/**
 * Score one document against the whole query.
 *
 * Every term must land somewhere (AND, not OR): a reader who types two
 * words means both, and a document that only knows one of them is not
 * what they asked for.
 * @param doc - A prepared document.
 * @param terms - Normalized query words.
 * @returns Total score, or 0 when any term is missing.
 */
export const scoreDoc = (
  doc: PreparedDoc,
  terms: readonly string[],
): number => {
  let total = 0;
  for (const term of terms) {
    const score = scoreTerm(doc, term);
    if (score === 0) return 0;
    total += score;
  }
  return total;
};
