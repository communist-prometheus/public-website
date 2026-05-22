import { getCollection } from 'astro:content';
import type { Language } from './i18n';

/**
 * Per-section content presence check used by the nav builder so we
 * don't link to sections that would render empty for the active
 * language. Each predicate runs in parallel during the static build
 * and is memoised within a single getStaticPaths invocation by
 * Astro's collection caching.
 */
type AvailableMap = Readonly<Record<string, boolean>>;

const blogHas = async (lang: Language): Promise<boolean> => {
  const items = await getCollection(
    'blog',
    ({ data }) => data.lang === lang && data.published === true,
  );
  return items.length > 0;
};

const positionsHas = async (lang: Language): Promise<boolean> => {
  const items = await getCollection(
    'positions',
    ({ data }) => data.lang === lang && data.published === true,
  );
  return items.length > 0;
};

const newspaperHas = async (lang: Language): Promise<boolean> => {
  const items = await getCollection(
    'newspaper',
    ({ data }) => data.lang === lang && data.published === true,
  );
  return items.length > 0;
};

const pageHas = async (slug: string, lang: Language): Promise<boolean> => {
  const items = await getCollection('pages', ({ data, id }) => {
    return data.lang === lang && id.startsWith(`${slug}/`);
  });
  return items.length > 0;
};

/**
 * Resolve which top-level sections actually have published content
 * for the given language. The home link is always present; every
 * other key is true only if at least one item exists.
 *
 * @param lang Current page language.
 * @returns A boolean per nav slot.
 */
export const getSectionAvailability = async (lang: Language): Promise<AvailableMap> => {
  const [blog, positions, newspaper, manifest, about] = await Promise.all([
    blogHas(lang),
    positionsHas(lang),
    newspaperHas(lang),
    pageHas('manifest', lang),
    pageHas('about', lang),
  ]);
  // `links` is a curated static page — always available.
  return { home: true, blog, positions, newspaper, manifest, about, links: true };
};
