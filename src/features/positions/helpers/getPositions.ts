import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Language } from '@/config/i18n';

const sortDate = (entry: CollectionEntry<'positions'>): number =>
  (entry.data.publishDate ?? new Date(0)).getTime();

export const getPositions = async (
  lang: Language,
): Promise<readonly CollectionEntry<'positions'>[]> => {
  const entries = await getCollection(
    'positions',
    ({ data }) => data.lang === lang && data.published === true,
  );
  return entries.sort((a, b) => sortDate(b) - sortDate(a));
};
