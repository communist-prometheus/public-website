import { click, expect, test, visit, waitForCondition } from '@prometheus/e2e-toolkit';

/**
 * E2E tests for scrollbar gutter stability.
 *
 * Verifies that navigating between pages with and without scrollbars
 * does not cause horizontal layout shift in the header.
 */
test.describe('Scrollbar gutter stability', () => {
  test('header position does not shift when navigating between scrollable and non-scrollable pages', async ({
    page,
  }) => {
    await visit(page, '/en');
    const getHeaderLeft = () =>
      page.locator('header .header-content').evaluate((el) => el.getBoundingClientRect().left);

    const homepageLeft = await getHeaderLeft();
    await click(page, page.locator('[data-testid="desktop-nav"] a[href="/en/manifest"]'));
    await waitForCondition(page, async () => /\/en\/manifest/.test(page.url()));
    const manifestLeft = await getHeaderLeft();
    expect(Math.abs(homepageLeft - manifestLeft)).toBeLessThanOrEqual(1);
  });

  test('html element has scrollbar-gutter: stable', async ({ page }) => {
    await visit(page, '/en');
    const gutter = await page.evaluate(() =>
      globalThis.getComputedStyle(document.documentElement).getPropertyValue('scrollbar-gutter'),
    );
    expect(gutter).toBe('stable');
  });
});
