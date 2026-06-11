import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

/**
 * Fetch the content repo into src/content/ at build time.
 *
 * Content lives in a separate repository (public-website-content) and
 * is no longer committed into the code repo. This keeps content state
 * strictly out of code merges so branching dev/prod doesn't leak
 * content from one environment to the other.
 *
 * Env: CONTENT_REPO defaults to communist-prometheus/public-website-content,
 * CONTENT_BRANCH defaults to master, GH_PAT is optional and only
 * needed for private repos. Set CONTENT_KEEP=1 to skip the refresh
 * entirely when iterating on content with uncommitted changes.
 *
 * Subsequent runs against an existing checkout fast-fetch + reset to
 * keep local dev iterations cheap.
 */
/*
 * Dynamic-key access dodges biome's `useLiteralKeys` while still
 * satisfying TS strict (`ts(4111)` index-signature) for `process.env`.
 */
const env = (key: string): string | undefined => process.env[key];

const REPO = env('CONTENT_REPO') ?? 'communist-prometheus/public-website-content';
const BRANCH = env('CONTENT_BRANCH') ?? 'master';
const TARGET = resolve('src/content');
const TOKEN = env('GH_PAT');
const URL = TOKEN
  ? `https://x-access-token:${TOKEN}@github.com/${REPO}.git`
  : `https://github.com/${REPO}.git`;

const log = (msg: string): void => {
  process.stdout.write(`[fetch-content] ${msg}\n`);
};

/*
 * execFileSync (argv array, no shell) instead of execSync: env-derived
 * values never pass through shell parsing, so a hostile CONTENT_BRANCH
 * or CONTENT_REPO cannot smuggle command separators into the build.
 */
const git = (args: readonly string[], cwd?: string): void => {
  execFileSync('git', [...args], { cwd, stdio: 'inherit' });
};

const main = (): void => {
  if (env('CONTENT_KEEP') === '1' && existsSync(TARGET)) {
    log(`CONTENT_KEEP=1 set, skipping refresh of ${TARGET}`);
    return;
  }

  if (existsSync(resolve(TARGET, '.git'))) {
    log(`refreshing ${TARGET} (branch=${BRANCH})`);
    git(['remote', 'set-url', 'origin', URL], TARGET);
    /*
     * Refspec form: writes the remote-tracking ref locally so the
     * subsequent reset can address it. A bare `git fetch origin <b>`
     * only updates FETCH_HEAD, which is brittle when switching
     * branches across runs (e.g. local CONTENT_BRANCH override).
     */
    git(
      ['fetch', '--depth=1', '--force', 'origin', `${BRANCH}:refs/remotes/origin/${BRANCH}`],
      TARGET,
    );
    git(['reset', '--hard', `origin/${BRANCH}`], TARGET);
    log('done');
    return;
  }

  if (existsSync(TARGET)) {
    log(`removing stale ${TARGET}`);
    rmSync(TARGET, { recursive: true, force: true });
  }
  mkdirSync(dirname(TARGET), { recursive: true });
  log(`cloning ${REPO}#${BRANCH} into ${TARGET}`);
  git(['clone', '--depth=1', `--branch=${BRANCH}`, URL, TARGET]);
  log('done');
};

main();
