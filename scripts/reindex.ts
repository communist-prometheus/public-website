/*
 * Re-embed the articles that changed, right after a deploy.
 *
 * The Worker does the actual work — it reads the freshly deployed index
 * through its own ASSETS binding, so it can never embed a version of an
 * article that is not the one being served. This script only drives it:
 * one call per batch, until the Worker says nothing is left.
 *
 * It is bounded on purpose. The Worker embeds a couple of documents per
 * call to stay inside its CPU budget, so a first run over a fresh index
 * takes many calls — but a normal deploy, where one article changed,
 * takes one.
 *
 * Run: bun scripts/reindex.ts --base https://dev.comprom.org
 * Needs REINDEX_SECRET in the environment; without it the Worker answers
 * 403 and this exits non-zero rather than pretending the index is fresh.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface Progress {
  readonly total: number;
  readonly indexed: number;
  readonly remaining: number;
}

/*
 * A runaway guard, not a budget: at 2 documents a call this is far more
 * than a full cold rebuild of every language would ever need.
 */
const MAX_CALLS = 400;

const arg = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};

/*
 * The languages are whatever the build emitted, not a list kept in step
 * by hand — `languages.json` lives in the content repo and editors add to
 * it without touching this repo.
 */
const languagesIn = (dist: string): readonly string[] =>
  readdirSync(dist, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(join(dist, name, 'search-index.json')));

const callOnce = async (base: string, secret: string, lang: string): Promise<Progress> => {
  const res = await fetch(`${base}/api/reindex`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Reindex-Key': secret,
    },
    body: JSON.stringify({ lang }),
  });
  if (!res.ok) {
    throw new Error(`reindex ${lang}: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as Progress;
};

const reindexLanguage = async (base: string, secret: string, lang: string): Promise<void> => {
  for (let call = 0; call < MAX_CALLS; call += 1) {
    const { total, indexed, remaining } = await callOnce(base, secret, lang);
    console.log(`[reindex] ${lang}: ${indexed} embedded, ${remaining} left of ${total}`);
    if (remaining === 0) return;
    /*
     * Nothing left to do but nothing got done either: the Worker is not
     * making progress, and looping MAX_CALLS times would only hide it.
     */
    if (indexed === 0) throw new Error(`reindex ${lang}: stuck`);
  }
  throw new Error(`reindex ${lang}: gave up after ${MAX_CALLS} calls`);
};

const main = async (): Promise<void> => {
  const base = arg('base');
  const { REINDEX_SECRET: secret } = process.env;
  if (base === undefined) throw new Error('missing --base');
  if (secret === undefined || secret === '') {
    throw new Error('missing REINDEX_SECRET');
  }

  const dist = resolve('dist');
  for (const lang of languagesIn(dist)) {
    await reindexLanguage(base, secret, lang);
  }
};

await main();
