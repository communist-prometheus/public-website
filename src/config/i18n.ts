export const SUPPORTED_LANGUAGES = ['en', 'ru', 'it', 'es'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  it: 'Italiano',
  es: 'Español',
};
