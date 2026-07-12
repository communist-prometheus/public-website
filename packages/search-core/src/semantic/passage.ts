import type { Snippet } from '../query/snippet';

/*
 * The vector store answers with coordinates, not text — the browser holds
 * the body already, so the passage is quoted here, on the client.
 *
 * No marks. A semantic hit matched by MEANING: there is no word in the
 * article that the reader typed, and painting one yellow anyway would
 * claim a match that never happened.
 */

/* A passage is a whole ~1000-character chunk; a result row shows the head
 * of it. The reader is choosing which article to open, not reading it. */
const PREVIEW = 240;

/*
 * Offsets are into the TRIMMED body — `chunkBody` trims before it cuts,
 * so anything reading them back must trim the same way or every quote
 * after the first blank line slides.
 */
const cutAtWord = (text: string): string => {
  if (text.length <= PREVIEW) return text;
  const head = text.slice(0, PREVIEW);
  const space = head.lastIndexOf(' ');
  return `${(space > 0 ? head.slice(0, space) : head).trimEnd()}…`;
};

/**
 * Quote the passage a semantic hit pointed at.
 * @param body - The document body, as it sits in the index.
 * @param start - Passage start, as returned by the vector store.
 * @param end - Passage end.
 * @returns A quote with no highlight ranges.
 */
export const passageSnippet = (
  body: string,
  start: number,
  end: number,
): Snippet => {
  const text = body.trim();
  const from = Math.min(Math.max(start, 0), text.length);
  const to = Math.min(Math.max(end, from), text.length);
  const quoted = text.slice(from, to).trim();
  return {
    text: cutAtWord(quoted === '' ? text.slice(0, PREVIEW) : quoted),
    marks: [],
  };
};
