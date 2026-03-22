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
