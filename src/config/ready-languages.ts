import { getCollection } from 'astro:content';
import { type Language, SUPPORTED_LANGUAGES } from './i18n';

/**
 * Slugs that must exist in every "ready" language. Advertising a
 * language on the public site without these guarantees at least a
 * usable home page, menu, and primary content pages.
 */
export const BASELINE_SLUGS: readonly {
  readonly collection: 'pages' | 'common';
  readonly slug: string;
}[] = [
  { collection: 'pages', slug: 'home' },
  { collection: 'pages', slug: 'manifest' },
  { collection: 'common', slug: 'menu' },
  { collection: 'common', slug: 'labels' },
];

const langHas = async (
  collection: 'pages' | 'common',
  slug: string,
  lang: Language,
): Promise<boolean> => {
  const entries = await getCollection(collection, ({ data }) => data.lang === lang);
  return entries.some((e) => e.id.startsWith(`${slug}/`));
};

const isLangReady = async (lang: Language): Promise<boolean> => {
  const checks = await Promise.all(BASELINE_SLUGS.map((b) => langHas(b.collection, b.slug, lang)));
  return checks.every(Boolean);
};

/**
 * Return the subset of SUPPORTED_LANGUAGES that actually has the
 * baseline pages/common entries. Used by `getStaticPaths` on every
 * `[lang]/*` route and by the public language switcher so that adding
 * a code to `settings/languages.json` alone never creates dead links.
 *
 * @returns list of ready language codes in the order they appear in
 * the settings file; falls back to the default language when nothing
 * qualifies.
 */
export const getReadyLanguages = async (): Promise<readonly Language[]> => {
  const checks = await Promise.all(
    SUPPORTED_LANGUAGES.map(async (lang) => ({
      lang,
      ready: await isLangReady(lang),
    })),
  );
  const ready = checks.filter((c) => c.ready).map((c) => c.lang);
  return ready.length > 0 ? ready : [SUPPORTED_LANGUAGES[0] ?? 'en'];
};
