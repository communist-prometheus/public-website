import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import { DEFAULT_LANGUAGE, type Language } from './i18n';

const findIn = async (
  collection: 'pages' | 'common',
  slug: string,
  lang: Language,
): Promise<CollectionEntry<'pages'> | CollectionEntry<'common'> | undefined> => {
  const entries = await getCollection(collection, ({ data }) => data.lang === lang);
  return entries.find((e) => e.id.startsWith(`${slug}/`));
};

const withFallback = async <T extends 'pages' | 'common'>(
  collection: T,
  slug: string,
  lang: Language,
): Promise<CollectionEntry<T> | undefined> => {
  const direct = (await findIn(collection, slug, lang)) as CollectionEntry<T> | undefined;
  if (direct) return direct;
  if (lang === DEFAULT_LANGUAGE) return undefined;
  return (await findIn(collection, slug, DEFAULT_LANGUAGE)) as CollectionEntry<T> | undefined;
};

/**
 * Fetch a page entry for the given language, falling back to the
 * default-language entry when the requested translation is missing.
 * Keeps /{lang}/<page> functional for languages that haven't been
 * translated yet.
 *
 * @param slug page slug (e.g. 'home', 'manifest')
 * @param lang target language
 * @returns entry in requested language or default fallback
 */
export const getPageData = (
  slug: string,
  lang: Language,
): Promise<CollectionEntry<'pages'> | undefined> => withFallback('pages', slug, lang);

/**
 * Fetch a common-content entry for the given language, falling back
 * to the default-language entry when missing.
 *
 * @param slug entry slug
 * @param lang target language
 * @returns entry or undefined
 */
export const getCommonData = (
  slug: string,
  lang: Language,
): Promise<CollectionEntry<'common'> | undefined> => withFallback('common', slug, lang);

export const getMenuData = (lang: Language) => getCommonData('menu', lang);

export const getLabelsData = (lang: Language) => getCommonData('labels', lang);

/**
 * Resolve the navigation links for a language. Uses the menu entry
 * with default-language fallback so that newly-added languages still
 * show a working nav until their own translation lands.
 *
 * @param lang target language
 * @returns nav-link tuples, or [] only when even the default lang
 * has no menu entry (broken state)
 */
export const getNavLinks = async (lang: Language) => {
  const menu = await getMenuData(lang);
  if (!menu) return [];
  return [
    { href: `/${lang}`, label: menu.data.home ?? 'Home' },
    { href: `/${lang}/about`, label: menu.data.about ?? 'About' },
    { href: `/${lang}/blog`, label: menu.data.blog ?? 'Blog' },
    { href: `/${lang}/positions`, label: menu.data.positions ?? 'Positions' },
    { href: `/${lang}/manifest`, label: menu.data.manifest ?? 'Manifest' },
    { href: `/${lang}/newspaper`, label: menu.data.newspaper ?? 'Newspaper' },
  ];
};
