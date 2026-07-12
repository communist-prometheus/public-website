import type { Mark, SearchHit } from '@prometheus/search-core';

/*
 * Rendering a hit means putting content-derived text into the DOM, so it
 * is the one place a body containing `<img src=x onerror=…>` could become
 * markup. The scorer hands over a plain string plus character RANGES, and
 * this splits the string on those ranges into parts the caller sets with
 * `textContent`. No HTML is ever assembled from content.
 */

/** A run of snippet text, and whether the query landed on it. */
export interface SnippetPart {
  readonly text: string;
  readonly marked: boolean;
}

const byStart = (a: Mark, b: Mark): number => a.start - b.start;

/* Overlapping ranges would produce parts that repeat the same characters. */
const merge = (marks: readonly Mark[]): readonly Mark[] => {
  const sorted = [...marks].sort(byStart);
  const out: Mark[] = [];
  for (const mark of sorted) {
    const last = out.at(-1);
    if (last !== undefined && mark.start <= last.end) {
      out[out.length - 1] = {
        start: last.start,
        end: Math.max(last.end, mark.end),
      };
      continue;
    }
    out.push(mark);
  }
  return out;
};

/**
 * Split a hit's snippet into plain and matched runs.
 * @param hit A search hit.
 * @returns Runs in order; concatenating their text rebuilds the snippet.
 */
export const snippetParts = (hit: SearchHit): readonly SnippetPart[] => {
  const { text, marks } = hit.snippet;
  const merged = merge(marks);
  const parts: SnippetPart[] = [];
  let at = 0;
  for (const mark of merged) {
    if (mark.start > at) {
      parts.push({ text: text.slice(at, mark.start), marked: false });
    }
    parts.push({ text: text.slice(mark.start, mark.end), marked: true });
    at = mark.end;
  }
  if (at < text.length) parts.push({ text: text.slice(at), marked: false });
  return parts;
};
