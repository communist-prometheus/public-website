import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Language } from '@/config/i18n';

export const getAboutEntries = async (
  lang: Language,
): Promise<readonly CollectionEntry<'about'>[]> => {
  const entries = await getCollection('about', ({ data }) => data.lang === lang);
  return entries.sort((a, b) => a.data.order - b.data.order);
};
