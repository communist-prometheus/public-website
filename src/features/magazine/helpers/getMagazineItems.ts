import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Language } from '@/config/i18n';

/**
 * A magazine issue from either collection. The schemas are identical —
 * `newspaper` is the pre-rename collection the content repo still ships
 * until its folder rename lands (see helpers/contentDir).
 */
export type MagazineIssue = CollectionEntry<'magazine'> | CollectionEntry<'newspaper'>;

const sortDate = (entry: MagazineIssue): number =>
  (entry.data.publishDate ?? entry.data.pubDate ?? new Date(0)).getTime();

/**
 * Every published issue, from whichever collection directory the
 * content repo currently ships. Exactly one of the two exists at a
 * time, so the concatenation never double-counts an issue.
 * @returns Published issues across the current and legacy collections.
 */
export const getAllIssues = async (): Promise<readonly MagazineIssue[]> => {
  const [magazine, legacy] = await Promise.all([
    getCollection('magazine', ({ data }) => data.published === true),
    getCollection('newspaper', ({ data }) => data.published === true),
  ]);
  return [...magazine, ...legacy];
};

/**
 * Published issues for one language, newest first.
 * @param lang - Target language.
 * @returns Sorted issue entries.
 */
export const getMagazineItems = async (lang: Language): Promise<readonly MagazineIssue[]> => {
  const issues = await getAllIssues();
  return issues.filter(({ data }) => data.lang === lang).sort((a, b) => sortDate(b) - sortDate(a));
};
