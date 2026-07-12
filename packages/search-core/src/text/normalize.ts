import { foldWithMap } from './fold';

/*
 * One fold, used for both the query and the indexed text, so the two are
 * always compared in the same alphabet.
 *
 * Defined in terms of `foldWithMap` on purpose: the snippet builder needs
 * the offsets back, and if matching used a second, separately-written
 * fold the two could drift apart — a term found by one would be missing
 * from the other, and the highlight would land nowhere.
 */

/**
 * Fold a string into the alphabet the index and the query share.
 * @param raw - Any user- or content-supplied text.
 * @returns Lower-case, diacritic-free, single-spaced text.
 */
export const normalize = (raw: string): string => foldWithMap(raw).text.trim();

/**
 * Split text into searchable words, normalising first.
 * @param raw - Any user- or content-supplied text.
 * @returns Words, in order; empty for text with no letters or digits.
 */
export const tokenize = (raw: string): readonly string[] => {
  const normalized = normalize(raw);
  return normalized === '' ? [] : normalized.split(' ');
};
