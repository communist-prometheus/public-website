/*
 * Passages, not articles.
 *
 * The articles here run to 72 000 characters. Embedding one as a single
 * vector averages the whole of it into something that is about nothing in
 * particular — it would match every query weakly and none of them well.
 * The passage is the unit of meaning.
 *
 * Offsets travel with each passage because the browser already holds the
 * body: the server can answer with coordinates instead of shipping the
 * text back, which is what keeps a semantic query small.
 */

/** A passage of a document, and where it sits in the body. */
export interface Chunk {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/* ~250 tokens of Russian prose: enough to hold an argument, small enough
 * that the vector is still about one thing. */
const SIZE = 1000;

/* A sentence that straddles a boundary would otherwise belong to neither
 * passage. The overlap is what stops the answer falling into the gap. */
const OVERLAP = 200;

const backToSpace = (text: string, at: number, floor: number): number => {
  const space = text.lastIndexOf(' ', at);
  return space > floor ? space : at;
};

/**
 * Split a plain-text body into overlapping passages.
 * @param body - Markdown-stripped body text.
 * @returns Passages in order; empty when there is no text.
 */
export const chunkBody = (body: string): readonly Chunk[] => {
  const text = body.trim();
  if (text === '') return [];
  if (text.length <= SIZE) {
    return [{ text, start: 0, end: text.length }];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  while (start < text.length) {
    const limit = Math.min(start + SIZE, text.length);
    /*
     * Cut on a space so no word is halved — unless the "word" is longer
     * than a whole chunk, in which case cutting mid-word is the only way
     * to make progress at all.
     */
    const end = limit === text.length ? limit : backToSpace(text, limit, start);
    chunks.push({ text: text.slice(start, end).trim(), start, end });
    if (end >= text.length) break;
    const next = end - OVERLAP;
    start = next > start ? backToSpace(text, next, start) + 1 : end + 1;
  }
  return chunks;
};
