import { type CollectionEntry, getCollection } from 'astro:content';
import type { Language } from '@/config/i18n';

export const getBlogPosts = async (lang: Language): Promise<CollectionEntry<'blog'>[]> => {
  const posts = await getCollection('blog', ({ data }) => data.lang === lang);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
};

export const getUniqueCategories = (posts: CollectionEntry<'blog'>[]): string[] => {
  const categories = new Set(posts.map((post) => post.data.category));
  return Array.from(categories);
};
