import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/*
 * TRANSITIONAL. The content repo still ships the issues under
 * `newspaper/`; the folder rename lands there in a separate commit
 * that auto-merges straight to content `master` and immediately
 * rebuilds prod. Resolving whichever directory is actually present
 * lets this build stay green on BOTH sides of that commit, so the
 * two repos never have to deploy in lockstep. The served URLs are
 * `/magazine/...` either way — the fallback only affects where the
 * bytes are read from.
 *
 * Delete this helper (and its call sites' fallbacks) once the
 * content repo is migrated.
 */
const CONTENT_ROOT = 'src/content';

/**
 * Name of the issues directory inside the content repo. Doubles as
 * the path segment the "Suggest changes" GitHub link needs.
 * @returns `magazine` once the content repo is migrated, else `newspaper`.
 */
export const magazineRepoDir = (): string =>
  existsSync(resolve(CONTENT_ROOT, 'magazine')) ? 'magazine' : 'newspaper';

/**
 * Absolute path of the issues directory in the fetched content checkout.
 * @returns Filesystem path to read issue assets from.
 */
export const magazineContentDir = (): string => resolve(CONTENT_ROOT, magazineRepoDir());
