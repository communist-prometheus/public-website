import { foldWithMap } from '../text/fold';
import { prefixDistanceWithin, maxEditsFor } from './distance';
import type { PreparedDoc } from './prepared';

/** A character range in {@link Snippet.text} that matched the query. */
export interface Mark {
  readonly start: number;
  readonly end: number;
}

/**
 * A quote from the document, and where inside it the query landed.
 *
 * Ranges, not HTML. The renderer escapes `text` and wraps `marks` itself,
 * so a body carrying `<img src=x onerror=…>` can never reach the DOM as
 * markup. Handing back a pre-highlighted string would put that one
 * forgotten `escape()` away.
 */
export interface Snippet {
  readonly text: string;
  readonly marks: readonly Mark[];
}

const RADIUS = 90;

/*
 * What to actually look for in the text.
 *
 * A term the reader misspelled is not IN the document — «искуственный»
 * never appears in an article that says «искусственного». Highlighting
 * nothing there would be honest but useless, so fall back to the token
 * the scorer matched: the reader sees the word they meant, spelled the
 * way the article spells it.
 */
/* One term can be spelled several ways in one article — «искусственный»,
 * «искусственного» — and marking only the closest of them leaves the
 * other sitting unmarked in the very same sentence. Take every token
 * within budget, capped so a loose match cannot paint the whole quote. */
const MAX_FORMS = 6;

const formsFor = (doc: PreparedDoc, terms: readonly string[]): readonly string[] =>
  terms.flatMap(term => {
    if (doc.body.includes(term) || doc.description.includes(term)) return [term];
    const budget = maxEditsFor(term);
    if (budget === 0) return [];
    const near: { token: string; distance: number }[] = [];
    for (const token of doc.tokens) {
      const distance = prefixDistanceWithin(term, token, budget);
      if (distance !== undefined) near.push({ token, distance });
    }
    return near
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_FORMS)
      .map(x => x.token);
  });

const findAll = (haystack: string, needle: string): readonly Mark[] => {
  const marks: Mark[] = [];
  let at = haystack.indexOf(needle);
  while (at >= 0) {
    marks.push({ start: at, end: at + needle.length });
    at = haystack.indexOf(needle, at + needle.length);
  }
  return marks;
};

const wordEdge = (text: string, at: number, forward: boolean): number => {
  const space = forward ? text.indexOf(' ', at) : text.lastIndexOf(' ', at);
  if (space < 0) return forward ? text.length : 0;
  return space;
};

/**
 * Quote the document around the first term that appears in it, and say
 * where inside that quote the query landed.
 * @param doc - A prepared document.
 * @param terms - Normalized query words.
 * @returns A quote plus the ranges inside it that matched.
 */
export const buildSnippet = (
  doc: PreparedDoc,
  terms: readonly string[],
): Snippet => {
  const source = doc.doc.body.trim() === '' ? doc.doc.description : doc.doc.body;
  const { text: folded, map } = foldWithMap(source);
  const forms = formsFor(doc, terms);

  /* Every hit, as a range in the SOURCE — the fold does not preserve offsets. */
  const inSource = forms
    .flatMap(form => findAll(folded, form))
    .map(m => ({
      start: map[m.start] ?? 0,
      end: (map[m.end - 1] ?? 0) + 1,
    }))
    .sort((a, b) => a.start - b.start);

  const first = inSource.at(0);
  if (first === undefined) {
    return { text: source.slice(0, RADIUS * 2).trim(), marks: [] };
  }

  const from = wordEdge(source, Math.max(0, first.start - RADIUS), false);
  const to = wordEdge(source, Math.min(source.length, first.end + RADIUS), true);
  const quoted = source.slice(from, to);
  const lead = quoted.length - quoted.trimStart().length;
  const text = quoted.trim();
  const offset = from + lead;

  const marks = inSource
    .map(m => ({ start: m.start - offset, end: m.end - offset }))
    .filter(m => m.start >= 0 && m.end <= text.length);
  return { text, marks };
};
