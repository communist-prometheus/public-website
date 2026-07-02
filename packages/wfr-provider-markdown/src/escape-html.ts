/** Replacements for the HTML-significant characters, applied left to right. */
const replacements: readonly (readonly [RegExp, string])[] = [
  [/&/g, '&amp;'],
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
];

/**
 * Escape the characters that would otherwise be interpreted as markup, so raw
 * text can be embedded safely inside a `<pre><code>` block. `&` is escaped
 * first to avoid double-escaping the entities introduced afterwards.
 */
export const escapeHtml = (text: string): string =>
  replacements.reduce((acc, [pattern, entity]) => acc.replace(pattern, entity), text);
