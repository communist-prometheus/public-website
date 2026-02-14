import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Language } from '@/config/i18n';

export const getPositions = async (
  lang: Language,
): Promise<readonly CollectionEntry<'positions'>[]> => {
  const entries = await getCollection('positions', ({ data }) => data.lang === lang);
  return entries.sort((a, b) => a.data.order - b.data.order);
};
