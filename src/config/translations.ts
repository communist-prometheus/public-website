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
 * Resolve the navigation links for a language. Each link is rendered
 * only when its localised label exists in the menu entry — no
 * English string fallbacks. If a translation is missing, fix the
 * content; the link is dropped from the nav until then.
 *
 * @param lang target language
 * @returns nav-link tuples, or [] only when even the default lang
 * has no menu entry (broken state)
 */
export const getNavLinks = async (
  lang: Language,
): Promise<ReadonlyArray<{ readonly href: string; readonly label: string }>> => {
  const menu = await getMenuData(lang);
  if (!menu) return [];
  const { getSectionAvailability } = await import('./section-availability');
  const has = await getSectionAvailability(lang);
  const candidates = [
    { key: 'home', href: `/${lang}`, label: menu.data.home },
    { key: 'blog', href: `/${lang}/blog`, label: menu.data.blog },
    { key: 'positions', href: `/${lang}/positions`, label: menu.data.positions },
    { key: 'manifest', href: `/${lang}/manifest`, label: menu.data.manifest },
    {
      key: 'magazine',
      href: `/${lang}/magazine`,
      /*
       * The menu entries still key the label as `newspaper` until the
       * content repo migrates. Without the fallback the link would
       * silently drop out of the nav in that window (a missing label is
       * treated as "not translated" below).
       */
      label: menu.data.magazine ?? menu.data.newspaper,
    },
    { key: 'archive', href: `/${lang}/archive`, label: menu.data.archive },
    { key: 'about', href: `/${lang}/about`, label: menu.data.about },
    { key: 'links', href: `/${lang}/links`, label: menu.data.links },
  ] as const;
  return candidates.flatMap((c) =>
    typeof c.label === 'string' && c.label.length > 0 && has[c.key] === true
      ? [{ href: c.href, label: c.label }]
      : [],
  );
};
