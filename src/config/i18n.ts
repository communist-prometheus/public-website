import languagesData from '@/content/settings/languages.json';

interface LanguageEntry {
  readonly code: string;
  readonly label: string;
}

const languages: readonly LanguageEntry[] = languagesData;

export const SUPPORTED_LANGUAGES = languages.map((l) => l.code);
export type Language = string;

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0] ?? 'en';

export const LANGUAGE_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  languages.map((l) => [l.code, l.label]),
);

/*
 * Overrides for the short abbreviation shown in the language-switcher
 * trigger. Defaults to the uppercased route code, but Ukrainian's
 * ISO 639-1 code `uk` uppercases to "UK" — the country code for the
 * United Kingdom — so editors asked for "UKR" instead (ticket #20).
 */
const SHORT_LABEL_OVERRIDES: Readonly<Record<string, string>> = { uk: 'UKR' };

/**
 * The abbreviation shown for a language in the switcher trigger.
 * @param code - The language route code (e.g. `uk`, `ru`).
 * @returns The override abbreviation when defined, else uppercased code.
 */
export const shortLabel = (code: string): string =>
  SHORT_LABEL_OVERRIDES[code] ?? code.toUpperCase();
