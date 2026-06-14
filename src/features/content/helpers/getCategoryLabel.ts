import { DEFAULT_LANGUAGE } from '@/config/i18n';
import labelsData from '@/content/settings/labels.json';

interface LabelEntry {
  readonly key: string;
  readonly translations: Record<string, string>;
}

const byKey = new Map((labelsData as readonly LabelEntry[]).map((l) => [l.key, l.translations]));

/**
 * Resolve a content category to its localized label.
 *
 * Categories are stored as canonical keys (e.g. `editorial`) and the
 * localized text lives in `settings/labels.json`. This is the single
 * place that turns a key into display text — cards, detail headers and
 * the filter all go through it so a category renders in the page
 * language instead of as a raw key.
 *
 * Tolerant by design: a key resolves to the language's translation
 * (falling back to English, then the key); a value that is NOT a known
 * key — a legacy hand-entered display string — is returned unchanged so
 * not-yet-migrated content keeps rendering.
 *
 * @param category - Category key (canonical) or legacy display value
 * @param lang - Current page language code
 * @returns Localized label for display
 */
export const getCategoryLabel = (category: string, lang: string): string => {
  const translations = byKey.get(category);
  if (!translations) return category;
  return translations[lang] ?? translations[DEFAULT_LANGUAGE] ?? category;
};
