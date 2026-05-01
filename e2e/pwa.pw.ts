import { expect, test, visit } from '@prometheus/e2e-toolkit';

/*
 * PWA install criteria smoke test.
 *
 * Validates the markup browsers look at to decide "this site can
 * become a PWA": web app manifest, theme-color, and an
 * apple-touch-icon. Does not exercise the install prompt itself —
 * that requires user-gesture + A2HS heuristics that headless
 * Chromium doesn't simulate.
 */

test.describe('PWA install criteria', () => {
  test('manifest endpoint returns a valid web app manifest', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.name).toBe('Communist Prometheus');
    expect(body.start_url).toBe('/');
    expect(body.display).toBe('standalone');
    expect(Array.isArray(body.icons)).toBe(true);
    expect(body.icons.length).toBeGreaterThan(0);
  });

  test('every page wires manifest, theme-color, and touch icon', async ({ page }) => {
    await visit(page, '/en');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.webmanifest',
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/pwa-icon.svg',
    );
    const themeColors = await page.locator('meta[name="theme-color"]').count();
    expect(themeColors).toBeGreaterThan(0);
  });
});
