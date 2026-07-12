/** Sections a document can belong to; drives the label on a result row. */
export type SearchSection =
  | 'blog'
  | 'positions'
  | 'magazine'
  | 'archive'
  | 'page';

/** One indexed document. */
export interface SearchDoc {
  /**
   * `${lang}/${section}/${slug}` — stable across builds.
   *
   * This is the shared key between the index the browser downloads and
   * the vector store the semantic search will keep. Nothing else about a
   * document is stable enough to key on: titles get edited, bodies get
   * rewritten, and positions in the list shift on every publish.
   */
  readonly id: string;
  readonly lang: string;
  readonly section: SearchSection;
  readonly slug: string;
  /** Where a result row points. */
  readonly url: string;
  readonly title: string;
  readonly description: string;
  /** Markdown stripped to plain text — what the body search runs over. */
  readonly body: string;
  /**
   * Fingerprint of the text above.
   *
   * The semantic pass (a later iteration) re-embeds a document only when
   * its hash moves, so publishing one article does not pay to re-embed
   * the whole site. It costs nothing to emit now and cannot be
   * reconstructed later without re-reading every article.
   */
  readonly hash: string;
}

/** A whole language's index, as served to the browser. */
export interface SearchIndex {
  readonly lang: string;
  readonly docs: readonly SearchDoc[];
}
