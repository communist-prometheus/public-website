import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Paths that must not coexist with src/content.config.ts. */
const FORBIDDEN = [
  'src/content/config.ts',
  'src/content/config.mjs',
  'src/content/config.mts',
] as const;

/**
 * Guard: only one Astro content-collections config must exist.
 *
 * @returns exit code 0 when the invariant holds, 1 otherwise
 */
export const checkSchema = (): number => {
  const stray = FORBIDDEN.filter((p) => existsSync(resolve(p)));
  if (stray.length === 0) return 0;
  // eslint-disable-next-line no-console
  console.error(
    `Forbidden legacy config file(s) present: ${stray.join(', ')}. ` +
      'Keep only src/content.config.ts.',
  );
  return 1;
};

process.exit(checkSchema());
