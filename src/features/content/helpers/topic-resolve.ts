/** A raw topic entry as stored in settings/topics.json. */
export interface TopicEntry {
  readonly key: string;
  readonly color: string;
  readonly name: Record<string, string>;
  readonly subtitle: Record<string, string>;
}

/** A topic resolved for one page language, ready to render. */
export interface ResolvedTopic {
  readonly key: string;
  readonly color: string;
  readonly name: string;
  readonly subtitle: string;
}

const localize = (
  dict: Record<string, string>,
  lang: string,
  defaultLang: string,
  fallback: string,
): string => dict[lang] ?? dict[defaultLang] ?? fallback;

/**
 * Resolve a topic key against a topic set to its colour + localized name
 * and subtitle. Pure and content-free so it unit-tests without the
 * content repo present: the data and default language are injected.
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
  return {
    key: entry.key,
    color: entry.color,
    name: localize(entry.name, lang, defaultLang, entry.key),
    subtitle: localize(entry.subtitle, lang, defaultLang, ''),
  };
};
