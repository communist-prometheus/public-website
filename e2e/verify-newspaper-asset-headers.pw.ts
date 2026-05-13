import process from 'node:process';
import { expect, test } from '@prometheus/e2e-toolkit';

/**
 * Prod probe — newspaper asset response headers.
 *
 * The `public/_headers` file pins `Content-Type` and
 * `Content-Disposition: attachment` for FB2 and DOCX assets so they
 * download as files instead of opening in the browser's XML / Word
 * preview. CF Workers Static Assets silently ignores `_headers`
 * patterns that contain more than one splat — this exact regression
 * already shipped once (the pattern `/newspaper/*\/assets/*.fb2`
 * was silently dropped and prod served FB2 with no Content-Type at
 * all, so the body sniffed as XML and "Save as" proposed `.xml`).
 *
 * This probe locks the contract end-to-end against prod so the
 * regression cannot ride out silently again.
 */
const PROD = process.env['PROBE_BASE_URL'] ?? 'https://comprom.org';

const ASSET_PATH = '/newspaper/magazine-1-mai-2026/assets/magazine-1-mai-2026.it.fb2';

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
