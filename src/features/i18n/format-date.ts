/*
 * Locale-aware article date formatting.
 *
 * Site language codes (see `content/settings/languages.json`) are not
 * always valid BCP-47 tags — `bl` is an internal alias for Bulgarian
 * and `Intl.DateTimeFormat` will silently fall back to English when
 * given an unknown subtag. The mapping below is the single place that
 * translates our internal codes to the proper BCP-47 locales used by
 * the platform `Intl` APIs.
 *
 * Keep this in sync with `SUPPORTED_LANGUAGES`.
 */

import type { Language } from '@/config/i18n';

const FALLBACK_LOCALE = 'en-US';

const LOCALE_BY_LANGUAGE: Readonly<Record<string, string>> = {
  en: FALLBACK_LOCALE,
  ru: 'ru-RU',
  it: 'it-IT',
  es: 'es-ES',
  bl: 'bg-BG',
  pl: 'pl-PL',
  uk: 'uk-UA',
};

const FORMAT_OPTIONS: Readonly<Intl.DateTimeFormatOptions> = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

/**
 * Format a publication date for the given site language. Maps internal
 * language codes (e.g. `bl`) to BCP-47 locales (e.g. `bg-BG`) so the
 * `Intl` runtime returns the localised string instead of falling back
 * to English.
 *
 * @param date Publication date (typically from frontmatter).
 * @param lang Active page language code.
 * @returns Localised long-form date, e.g. `5 мая 2026 г.`.
 */
export const formatArticleDate = (date: Date, lang: Language): string => {
  const locale = LOCALE_BY_LANGUAGE[lang] ?? FALLBACK_LOCALE;
  return new Intl.DateTimeFormat(locale, FORMAT_OPTIONS).format(date);
};
