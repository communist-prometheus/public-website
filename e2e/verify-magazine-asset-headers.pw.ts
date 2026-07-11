import process from 'node:process';
import { expect, test } from '@prometheus/e2e-toolkit';

/**
 * Prod probe — magazine asset response headers, plus the permanent
 * newspaper → magazine redirects.
 *
 * The `public/_headers` file pins `Content-Type` and
 * `Content-Disposition: attachment` for FB2 and DOCX assets so they
 * download as files instead of opening in the browser's XML / Word
 * preview. CF Workers Static Assets silently ignores `_headers` and
 * `_redirects` patterns carrying more than one splat — this exact
 * regression already shipped once (the pattern
 * `/newspaper/*\/assets/*.fb2` was silently dropped and prod served FB2
 * with no Content-Type at all, so the body sniffed as XML and "Save as"
 * proposed `.xml`).
 *
 * This probe locks both contracts end-to-end against prod so the
 * regression cannot ride out silently again.
 */
const PROD = process.env['PROBE_BASE_URL'] ?? 'https://comprom.org';

const SLUG = 'magazine-1-mai-2026';
const ASSET_PATH = `/magazine/${SLUG}/assets/${SLUG}.it.fb2`;
const LEGACY_ASSET_PATH = `/newspaper/${SLUG}/assets/${SLUG}.it.fb2`;

test('prod: .fb2 served with FictionBook MIME + attachment disposition', async ({ request }) => {
  const res = await request.fetch(`${PROD}${ASSET_PATH}?probe=${Date.now()}`);
  expect(res.status(), `${ASSET_PATH} must exist`).toBe(200);

  const headers = res.headers();
  expect(headers['content-type']).toBe('application/x-fictionbook+xml');
  expect(headers['content-disposition']).toContain('attachment');

  const body = await res.body();
  expect(body.byteLength).toBeGreaterThan(0);
  expect(body.subarray(0, 5).toString('utf8')).toBe('<?xml');
});

/*
 * Every path the section used to answer on. A 302 would be nearly as
 * bad as a 404 here: the old URL stays in the index and keeps splitting
 * link equity with the new one.
 */
const REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ['/ru/newspaper', '/ru/magazine'],
  ['/ru/newspaper.xml', '/ru/magazine.xml'],
  [`/ru/newspaper/${SLUG}`, `/ru/magazine/${SLUG}`],
  [LEGACY_ASSET_PATH, ASSET_PATH],
];

for (const [from, to] of REDIRECTS) {
  test(`prod: ${from} redirects permanently to ${to}`, async ({ request }) => {
    const res = await request.fetch(`${PROD}${from}`, { maxRedirects: 0 });
    expect(res.status(), `${from} must answer 301`).toBe(301);
    expect(res.headers()['location']).toBe(to);
  });
}
