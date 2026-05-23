import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HEADERS = resolve('public/_headers');

/*
 * `_headers` is parsed by Cloudflare Workers Static Assets at edge
 * time. We can't unit-test the edge behaviour from here, but we
 * can guarantee the rule that controls SW rollover is still in the
 * file: without it the browser caches /sw.js along with the rest
 * of the site and a deploy can take 24h to roll forward.
 */
describe('public/_headers', () => {
  const text = readFileSync(HEADERS, 'utf-8');

  it('declares a /sw.js rule', () => {
    expect(text).toMatch(/^\/sw\.js$/m);
  });

  it('marks /sw.js as no-cache so the browser always revalidates', () => {
    const swSection = text.split(/^(?=\/)/m).find((s) => s.startsWith('/sw.js'));
    expect(swSection, '/sw.js section is missing').toBeDefined();
    expect(swSection ?? '').toMatch(/Cache-Control:\s*[^\n]*no-cache/i);
  });
});
