import { DEFAULT_LANGUAGE } from '@/config/i18n';
import topicsData from '@/content/settings/topics.json';

interface TopicEntry {
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

const byKey = new Map((topicsData as readonly TopicEntry[]).map((t) => [t.key, t] as const));

const localize = (dict: Record<string, string>, lang: string, fallback: string): string =>
  dict[lang] ?? dict[DEFAULT_LANGUAGE] ?? fallback;

/**
 * Resolve an article's topic key to its colour + localized name and
 * subtitle. Topics are a parallel taxonomy to categories: their keys
 * live in `settings/topics.json` and the localized text follows the same
 * key → translations pattern as labels.
 *
 * Tolerant by design so the page and card can call it unconditionally: an
 * absent or unknown key yields `undefined` (no marker), and a missing
 * locale falls back to the default language, then the raw key (name) or
 * an empty string (subtitle).
 *
 * @param key - Topic key from article frontmatter, or undefined
 * @param lang - Current page language code
 * @returns The resolved topic, or undefined when there is no marker
 */
export const getTopic = (key: string | undefined, lang: string): ResolvedTopic | undefined => {
  if (!key) return undefined;
  const entry = byKey.get(key);
  if (!entry) return undefined;
  return {
    key: entry.key,
    color: entry.color,
    name: localize(entry.name, lang, entry.key),
    subtitle: localize(entry.subtitle, lang, ''),
  };
};
