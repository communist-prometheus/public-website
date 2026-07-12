import type { SearchDoc, SearchIndex } from '../model/doc';
import { normalize, tokenize } from '../text/normalize';

/**
 * A document with everything the scorer needs precomputed.
 *
 * Normalising a body on every keystroke would cost more than the search
 * itself, so it is done once per index. `tokens` is the set of UNIQUE
 * words: fuzzy matching walks it, and a document of 5 000 words holds
 * perhaps 1 500 distinct ones — that ratio is what keeps typing
 * responsive.
 */
export interface PreparedDoc {
  readonly doc: SearchDoc;
  readonly title: string;
  readonly description: string;
  readonly body: string;
  readonly tokens: ReadonlySet<string>;
}

/** An index with its documents prepared for scoring. */
export interface PreparedIndex {
  readonly lang: string;
  readonly docs: readonly PreparedDoc[];
}

const prepareDoc = (doc: SearchDoc): PreparedDoc => {
  const title = normalize(doc.title);
  const description = normalize(doc.description);
  const body = normalize(doc.body);
  return {
    doc,
    title,
    description,
    body,
    tokens: new Set([
      ...tokenize(title),
      ...tokenize(description),
      ...tokenize(body),
    ]),
  };
};

/**
 * Normalise an index once, so each keystroke only has to score it.
 * @param index - The index as downloaded.
 * @returns The same documents, ready to search.
 */
export const prepare = (index: SearchIndex): PreparedIndex => ({
  lang: index.lang,
  docs: index.docs.map(prepareDoc),
});
