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

export const getCommonData = async (
  slug: string,
  lang: Language,
): Promise<CollectionEntry<'common'> | undefined> => {
  const entries = await getCollection('common', ({ data }) => data.lang === lang);
  return entries.find((e) => e.id.startsWith(`${slug}/`));
};

export const getMenuData = async (lang: Language) => getCommonData('menu', lang);

export const getLabelsData = async (lang: Language) => getCommonData('labels', lang);

export const getNavLinks = async (lang: Language) => {
  const menu = await getMenuData(lang);
  if (!menu) return [];
  return [
    { href: `/${lang}`, label: menu.data.home ?? 'Home' },
    { href: `/${lang}/blog`, label: menu.data.blog ?? 'Blog' },
    { href: `/${lang}/positions`, label: menu.data.positions ?? 'Positions' },
    { href: `/${lang}/manifest`, label: menu.data.manifest ?? 'Manifest' },
    { href: `/${lang}/newspaper`, label: menu.data.newspaper ?? 'Newspaper' },
  ];
};
