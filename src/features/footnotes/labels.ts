/*
 * Per-language strings shown inside the footnote popover. Falls
 * back to English when the active page language isn't covered.
 */

const JUMP: Readonly<Record<string, string>> = {
  en: 'See in footnotes',
  ru: 'Перейти к сноске',
  it: 'Vai alla nota',
  es: 'Ir a la nota',
  uk: 'Перейти до примітки',
  pl: 'Przejdź do przypisu',
  bl: 'Виж бележката',
};

const TITLE: Readonly<Record<string, (n: number) => string>> = {
  en: (n) => `Footnote ${n}`,
  ru: (n) => `Сноска ${n}`,
  it: (n) => `Nota ${n}`,
  es: (n) => `Nota ${n}`,
  uk: (n) => `Примітка ${n}`,
  pl: (n) => `Przypis ${n}`,
  bl: (n) => `Бележка ${n}`,
};

const EN_JUMP = 'See in footnotes';

/**
 * Localised label for the "jump to the footnote section" link
 * rendered inside every footnote popover.
 * @param lang - Active page language code.
 * @returns Localised jump-link label.
 */
export const jumpLabel = (lang: string): string => JUMP[lang] ?? EN_JUMP;

/**
 * Localised accessible name for the popover (`aria-label`).
 * @param lang - Active page language code.
 * @param n - Footnote number.
 * @returns Localised popover label.
 */
const enTitle = (n: number): string => `Footnote ${n}`;

export const popoverLabel = (lang: string, n: number): string => {
  const builder = TITLE[lang] ?? enTitle;
  return builder(n);
};
