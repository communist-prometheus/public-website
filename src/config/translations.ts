import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Language } from './i18n';

export const getPageData = async (
  slug: string,
  lang: Language,
): Promise<CollectionEntry<'pages'> | undefined> => {
  const pages = await getCollection('pages', ({ data }) => data.lang === lang);
  return pages.find((p) => p.id.startsWith(`${slug}/`));
};

export const getNavData = async (lang: Language): Promise<CollectionEntry<'nav'> | undefined> => {
  const entries = await getCollection('nav', ({ data }) => data.lang === lang);
  return entries.at(0);
};

export const getNavLinks = async (lang: Language) => {
  const nav = await getNavData(lang);
  if (!nav) return [];
  return [
    { href: `/${lang}`, label: nav.data.home },
    { href: `/${lang}/blog`, label: nav.data.blog },
    { href: `/${lang}/positions`, label: nav.data.positions },
    { href: `/${lang}/manifest`, label: nav.data.manifest },
  ];
};
