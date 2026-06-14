import { expect, test, visit } from '@prometheus/e2e-toolkit';

/**
 * Header scroll behaviour must survive a ClientRouter (View
 * Transitions) navigation. The header's inline script publishes
 * `--header-height`, which the sticky article TOC and global
 * `scroll-padding-top` depend on. A menu navigation swaps the header
 * element; if the script keeps measuring the old detached node it
 * publishes a stale/zero height and content positioning diverges from
 * a full reload — which is the correct, server-rendered baseline.
 */

const headerHeight = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--header-height').trim(),
  );

test('--header-height after client nav matches a full reload', async ({ page }) => {
  await visit(page, '/en/blog');
  const onListing = await headerHeight(page);
  expect(Number.parseFloat(onListing)).toBeGreaterThan(0);

  /*
   * Client-side navigation (no reload) to an article. Wait for the
   * ClientRouter's page-load (registered BEFORE the click) so the
   * header script has re-run against the swapped-in header before we
   * read the height it publishes — the CSS var on <html> survives the
   * swap and would otherwise still hold the listing's value.
   */
  const pageLoaded = page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        document.addEventListener('astro:page-load', () => resolve(), {
          once: true,
        });
      }),
  );
  await page.locator('.post-card a').first().click();
  await page.waitForURL(/\/en\/blog\/.+/);
  await pageLoaded;
  const viaMenu = await headerHeight(page);

  // Full reload of the same article — the server-rendered baseline.
  await page.reload();
  const viaReload = await headerHeight(page);

  expect(Number.parseFloat(viaReload)).toBeGreaterThan(0);
  expect(viaMenu).toBe(viaReload);
});
