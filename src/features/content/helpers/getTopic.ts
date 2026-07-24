import { DEFAULT_LANGUAGE } from '@/config/i18n';
import topicsData from '@/content/settings/topics.json';
import { type ResolvedTopic, resolveTopic, type TopicEntry } from './topic-resolve';

export type { ResolvedTopic } from './topic-resolve';

const topics = topicsData as readonly TopicEntry[];

/**
 * Resolve an article's topic key to its colour + localized name and
 * subtitle, using the seeded `settings/topics.json` and the site's
 * default language. Thin wrapper over the pure `resolveTopic`; see it for
 * the fallback semantics.
 *
 * @param key - Topic key from article frontmatter, or undefined
 * @param lang - Current page language code
 * @returns The resolved topic, or undefined when there is no marker
 */
export const getTopic = (key: string | undefined, lang: string): ResolvedTopic | undefined =>
  resolveTopic(topics, key, lang, DEFAULT_LANGUAGE);
