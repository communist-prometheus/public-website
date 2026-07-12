/*
 * FNV-1a, 32-bit.
 *
 * Not a security hash — a change detector. It must be stable across
 * builds and processes, because the semantic pass (a later iteration)
 * re-embeds a document only when its hash moves: anything seeded by
 * time, iteration order or a salt would re-embed the whole site on every
 * deploy. A crypto hash would do the same job, but not without pulling
 * `node:crypto` into a package that has to run in the browser too.
 */

const OFFSET_BASIS = 0x811c9dc5;
const PRIME = 0x01000193;

/* Cannot occur in content, so it cannot be confused with a field's text. */
const FIELD_SEPARATOR = '\u001f';

const fnv1a = (text: string): number => {
  let hash = OFFSET_BASIS;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    /* Multiply by the prime in 32-bit space without overflowing to float. */
    hash = Math.imul(hash, PRIME);
  }
  return hash >>> 0;
};

/**
 * Fingerprint a document's searchable text.
 * @param title - Document title.
 * @param description - Document description (may be empty).
 * @param body - Plain-text body.
 * @returns Eight hex characters, stable for identical input.
 */
export const contentHash = (
  title: string,
  description: string,
  body: string,
): string =>
  fnv1a([title, description, body].join(FIELD_SEPARATOR))
    .toString(16)
    .padStart(8, '0');
