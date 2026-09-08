/**
 * An article's topics, gathered from the two levels that can carry them.
 *
 * `topics` belongs to the material and is written into every language of it;
 * `languageTopics` belongs to one translation. The two add up, so a translation
 * can carry a marker of its own on top of the material's. `topic` is the
 * single-key form the existing content was written with and still counts.
 */

/** The topic-bearing fields of an article's frontmatter. */
export interface TopicSource {
  /** Legacy single key. */
  readonly topic?: string | undefined;
  /** Material-level topics: the same in every language. */
  readonly topics?: readonly string[] | undefined;
  /** Topics of this translation only. */
  readonly languageTopics?: readonly string[] | undefined;
}

/**
 * The article's topic keys, material level first, without repeats or blanks.
 * @param source - the article's frontmatter
 * @returns topic keys in display order
 */
export const articleTopicKeys = (source: TopicSource): readonly string[] => {
  const all = [source.topic ?? '', ...(source.topics ?? []), ...(source.languageTopics ?? [])];
  return [...new Set(all.map((key) => key.trim()).filter((key) => key !== ''))];
};
