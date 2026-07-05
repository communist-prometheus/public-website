/**
 * Escape text for safe interpolation into HTML markup. Cell content is never
 * injected raw — every dangerous character is replaced with its entity so a
 * malicious value cannot break out of the surrounding element or attribute.
 */

const replacements: ReadonlyMap<string, string> = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
]);

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => replacements.get(char) ?? char);
