/** A raw topic entry as stored in settings/topics.json. */
export interface TopicEntry {
  readonly key: string;
  readonly color: string;
  readonly name: Record<string, string>;
  readonly subtitle: Record<string, string>;
  /** Optional long disclaimer shown only on the article banner. */
  readonly description?: Record<string, string>;
}

/** A topic resolved for one page language, ready to render. */
export interface ResolvedTopic {
  readonly key: string;
  readonly color: string;
  readonly name: string;
  /** Short приписка — the listing card tag. */
  readonly subtitle: string;
  /** Long disclaimer for the article banner; falls back to the subtitle. */
  readonly description: string;
}

const localize = (
  dict: Record<string, string>,
  lang: string,
  defaultLang: string,
  fallback: string,
): string => dict[lang] ?? dict[defaultLang] ?? fallback;

/**
 * Resolve a topic key against a topic set to its colour, short subtitle
 * (the card tag) and long description (the article banner disclaimer,
 * which falls back to the subtitle when absent). Pure and content-free so
 * it unit-tests without the content repo present.
 *
 * Tolerant by design — an absent or unknown key yields `undefined` (no
 * marker), and a missing locale falls back to the default language, then
 * the raw key (name) or an empty string (subtitle).
 *
 * @param topics - Available topic entries
 * @param key - Topic key from article frontmatter, or undefined
 * @param lang - Current page language code
 * @param defaultLang - Fallback language code
 * @returns The resolved topic, or undefined when there is no marker
 */
export const resolveTopic = (
  topics: readonly TopicEntry[],
  key: string | undefined,
  lang: string,
  defaultLang: string,
): ResolvedTopic | undefined => {
  if (!key) return undefined;
  const entry = topics.find((t) => t.key === key);
  if (!entry) return undefined;
  const subtitle = localize(entry.subtitle, lang, defaultLang, '');
  return {
    key: entry.key,
    color: entry.color,
    name: localize(entry.name, lang, defaultLang, entry.key),
    subtitle,
    description: entry.description
      ? localize(entry.description, lang, defaultLang, subtitle)
      : subtitle,
  };
};
