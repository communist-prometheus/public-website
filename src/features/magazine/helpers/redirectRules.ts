/*
 * Parser for `public/_redirects`, used by the unit test that guards
 * the file's shape.
 *
 * CF Workers Static Assets silently IGNORES a rule that carries more
 * than one `*` — the exact footgun documented at the top of
 * `public/_headers`, which already shipped a dead rule once. A dead
 * redirect rule means every old `/newspaper` URL 404s instead of
 * moving to `/magazine`, so the shape is worth asserting in CI rather
 * than discovering in the search console.
 */

export interface RedirectRule {
  readonly source: string;
  readonly destination: string;
  readonly status: number;
}

/* CF applies 302 when a rule omits the status — never what we want here. */
const IMPLICIT_STATUS = 302;

const isRule = (line: string): boolean => line.length > 0 && !line.startsWith('#');

const toRule = (line: string): readonly RedirectRule[] => {
  const [source, destination, status] = line.split(/\s+/);
  if (source === undefined || destination === undefined) return [];
  return [{ source, destination, status: Number(status ?? IMPLICIT_STATUS) }];
};

/**
 * Count the splats in a CF URL pattern.
 * @param pattern - Redirect source pattern.
 * @returns Number of `*` wildcards it contains.
 */
export const splatCount = (pattern: string): number => (pattern.match(/\*/g) ?? []).length;

/**
 * Parse a `_redirects` file into rules, skipping comments and blanks.
 * @param text - Raw file contents.
 * @returns One rule per directive, in file order.
 */
export const parseRedirectRules = (text: string): readonly RedirectRule[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(isRule)
    .flatMap(toRule);
