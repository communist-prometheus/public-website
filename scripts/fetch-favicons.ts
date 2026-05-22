import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Build-time favicon fetch (privacy-preserving). For each unique host
 * in `settings/links.json` we fetch the icon from DuckDuckGo's icon
 * service **on the build server** and self-host the result under
 * `public/favicons/`. Visitors then load icons only from our own
 * origin — they never contact a third-party icon service, so opening
 * the links page leaks nothing to the 42 external sites.
 *
 * Best-effort: any failure (network, non-image, empty) is skipped and
 * the page renders a fallback glyph. Never throws — a flaky icon host
 * must not break the build. Writes `src/data/favicon-manifest.json`
 * mapping host → local path.
 *
 * Runs after `fetch-content` (needs src/content/settings/links.json).
 */
const root = resolve(import.meta.dirname, '..');
const linksPath = resolve(root, 'src/content/settings/links.json');
const outDir = resolve(root, 'public/favicons');
const manifestPath = resolve(root, 'src/data/favicon-manifest.json');
const TIMEOUT_MS = 8000;

const log = (m: string): void => {
  process.stdout.write(`[fetch-favicons] ${m}\n`);
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

const fetchIcon = async (host: string): Promise<Uint8Array | undefined> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://icons.duckduckgo.com/ip3/${host}.ico`, {
      signal: controller.signal,
    });
    if (!res.ok) return undefined;
    const buf = new Uint8Array(await res.arrayBuffer());
    /*
     * DDG returns a 1x1/empty placeholder for unknown hosts; treat
     * tiny payloads as "no icon".
     */
    return buf.byteLength > 100 ? buf : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
};

const main = async (): Promise<void> => {
  const doc = JSON.parse(readFileSync(linksPath, 'utf8')) as {
    entries: readonly { url: string }[];
  };
  const hosts = [...new Set(doc.entries.map((e) => hostOf(e.url)).filter(Boolean))];
  mkdirSync(outDir, { recursive: true });

  const manifest: Record<string, string> = {};
  let ok = 0;
  for (const host of hosts) {
    const bytes = await fetchIcon(host);
    if (!bytes) continue;
    const file = `${host}.png`;
    writeFileSync(resolve(outDir, file), bytes);
    manifest[host] = `/favicons/${file}`;
    ok += 1;
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  log(`${ok}/${hosts.length} favicons fetched`);
};

await main();
