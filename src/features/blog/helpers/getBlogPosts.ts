import { type CollectionEntry, getCollection } from 'astro:content';
import type { Language } from '@/config/i18n';

export const getArticleSlug = (entry: CollectionEntry<'blog'>): string =>
  entry.id.split('/').at(0) ?? entry.id;

const sortDate = (entry: CollectionEntry<'blog'>): number =>
  (entry.data.publishDate ?? entry.data.pubDate).getTime();

export const getBlogPosts = async (lang: Language): Promise<CollectionEntry<'blog'>[]> => {
  const posts = await getCollection(
    'blog',
    ({ data }) => data.lang === lang && data.published === true,
  );
  return posts.sort((a, b) => sortDate(b) - sortDate(a));
};

export const getUniqueCategories = (posts: CollectionEntry<'blog'>[]): string[] => {
  const categories = new Set(posts.map((post) => post.data.category));
  return Array.from(categories);
};
