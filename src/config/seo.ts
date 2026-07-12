import { SUPPORTED_LANGUAGES } from './i18n';

export const SITE_URL = 'https://comprom.org';

/*
 * Strip the leading `/<lang>` prefix so we can rebuild the same
 * path for every other supported language.
 */
const localePath = (pathname: string): string => pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');

const ensureTrailingPath = (pathname: string): string => (pathname === '' ? '/' : pathname);

interface Alt {
  readonly hreflang: string;
  readonly href: string;
}

/*
 * Map admin/site-internal lang code → BCP-47 tag for `hreflang`.
 * Google rejects `hreflang="bl"`; Bulgarian must be `bg`.
 */
const hreflangByCode: Readonly<Record<string, string>> = {
  en: 'en',
  ru: 'ru',
  it: 'it',
  es: 'es',
  bl: 'bg',
  pl: 'pl',
  uk: 'uk',
};

/**
 * Build the set of `<link rel="alternate" hreflang="…">` rows for a
 * given page. Each locale gets its own entry plus an `x-default`
 * pointing at the English variant (or the first available locale) so
 * Google has a fallback for regions without explicit targeting.
 *
 * Pass `allowedLangs` on per-translation pages (blog/positions/
 * magazine/archive) to advertise ONLY the locales the content is
 * actually published in — otherwise Google is pointed at locales that
 * now 404, since an unpublished language version is no longer built.
 * @param currentPath - Astro.url.pathname for the page being rendered
 * @param allowedLangs - optional whitelist of locales that exist for this page; defaults to every supported locale
 * @returns Alternates list ready to map into `<link>` tags
 */
export const buildHreflangAlternates = (
  currentPath: string,
  allowedLangs?: readonly string[],
): readonly Alt[] => {
  const rest = ensureTrailingPath(localePath(currentPath));
  const hrefFor = (code: string) => `${SITE_URL}/${code}${rest === '/' ? '' : rest}`;
  const langs = allowedLangs
    ? SUPPORTED_LANGUAGES.filter((code) => allowedLangs.includes(code))
    : SUPPORTED_LANGUAGES;
  const alts: Alt[] = langs.map((code) => ({
    hreflang: hreflangByCode[code] ?? code,
    href: hrefFor(code),
  }));
  const xDefault = langs.includes('en') ? 'en' : langs.at(0);
  return xDefault ? [...alts, { hreflang: 'x-default', href: hrefFor(xDefault) }] : alts;
};
