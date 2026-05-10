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
 * Build the full set of `<link rel="alternate" hreflang="…">` rows
 * for a given page. Each locale gets its own entry plus an
 * `x-default` pointing at the English variant so Google has a
 * fallback for regions without explicit targeting.
 * @param currentPath - Astro.url.pathname for the page being rendered
 * @returns Alternates list ready to map into `<link>` tags
 */
export const buildHreflangAlternates = (currentPath: string): readonly Alt[] => {
  const rest = ensureTrailingPath(localePath(currentPath));
  const result: Alt[] = [];
  for (const code of SUPPORTED_LANGUAGES) {
    const tag = hreflangByCode[code] ?? code;
    const href = `${SITE_URL}/${code}${rest === '/' ? '' : rest}`;
    result.push({ hreflang: tag, href });
  }
  result.push({ hreflang: 'x-default', href: `${SITE_URL}/en${rest === '/' ? '' : rest}` });
  return result;
};
