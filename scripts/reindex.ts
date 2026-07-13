/*
 * Re-embed the articles that changed, right after a deploy.
 *
 * The Worker does the actual work — it reads the freshly deployed index
 * through its own ASSETS binding, so it can never embed a version of an
 * article that is not the one being served. This script only drives it.
 *
 * It asks ONCE what is stale, then walks that list. It does not re-ask
 * between batches: Vectorize is eventually consistent, so for a few
 * seconds after a write the store still reports the old state, and a job
 * that re-plans between batches keeps re-embedding what it has just done —
 * which is exactly what it did, in a circle, on dev.
 *
 * Run: bun scripts/reindex.ts --base https://dev.comprom.org
 * Needs REINDEX_SECRET in the environment; without it the Worker answers
 * 403 and this exits non-zero rather than pretending the index is fresh.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface Plan {
  readonly total: number;
  readonly stale: readonly string[];
}

/*
 * The Worker embeds at most this many documents per call — see its own
 * MAX_DOCS_PER_CALL. Asking for more would silently drop the rest.
 */
const DOCS_PER_CALL = 2;

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

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/*
 * A deploy does not become live everywhere the moment wrangler returns.
 * Until it does, the edge still answers `/api/*` from the asset store —
 * and a POST at a static file is a 405. That is the deploy still landing,
 * not a broken Worker, so wait it out rather than fail the pipeline.
 *
 * A 5xx gets the same patience but much less of it: the model and the
 * vector store are remote services, and one blip should not fail a deploy
 * that is otherwise fine. Three tries, then say so.
 */
const NOT_LIVE_YET = new Set([404, 405]);
const LIVE_TRIES = 20;
const LIVE_WAIT_MS = 6000;
const SERVER_TRIES = 3;
const SERVER_WAIT_MS = 5000;

const post = async (
  base: string,
  secret: string,
  body: Record<string, unknown>,
): Promise<Response> =>
  fetch(`${base}/api/reindex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Reindex-Key': secret },
    body: JSON.stringify(body),
  });

const call = async <T>(base: string, secret: string, body: Record<string, unknown>): Promise<T> => {
  let serverTries = 0;
  for (let attempt = 0; attempt < LIVE_TRIES; attempt += 1) {
    const res = await post(base, secret, body);
    if (res.ok) return (await res.json()) as T;

    if (NOT_LIVE_YET.has(res.status)) {
      console.log(`[reindex] worker not live yet (${res.status}), waiting…`);
      await sleep(LIVE_WAIT_MS);
      continue;
    }
    if (res.status >= 500 && serverTries < SERVER_TRIES) {
      serverTries += 1;
      console.log(`[reindex] ${res.status} from the worker, retry ${serverTries}`);
      await sleep(SERVER_WAIT_MS);
      continue;
    }
    throw new Error(`reindex: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error('reindex: worker never came up');
};

const reindexLanguage = async (base: string, secret: string, lang: string): Promise<void> => {
  const { total, stale } = await call<Plan>(base, secret, { lang });
  console.log(`[reindex] ${lang}: ${stale.length} stale of ${total}`);

  for (let at = 0; at < stale.length; at += DOCS_PER_CALL) {
    const docs = stale.slice(at, at + DOCS_PER_CALL);
    await call(base, secret, { lang, docs });
    console.log(`[reindex] ${lang}: embedded ${docs.join(', ')}`);
  }
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
