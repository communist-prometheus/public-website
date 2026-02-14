import { expect, test } from '@playwright/test';

/**
 * Active navigation item E2E tests.
 *
 * Covers:
 * 1. Home link is active on home page
 * 2. Blog link is active on blog page
 * 3. Manifest link is active on manifest page
 * 4. Active state updates after SPA navigation
 * 5. Only one link is active at a time
 */

const HOME = '/en';
const BLOG = '/en/blog';
const MANIFEST = '/en/manifest';

test.describe('Active navigation item', () => {
  test('Home link is active on home page', async ({ page }) => {
    await page.goto(HOME);
    await page.waitForLoadState('networkidle');

    const homeLink = page.locator('[data-testid="desktop-nav"] a[href="/en"]');
    await expect(homeLink).toHaveAttribute('aria-current', 'page');

    const blogLink = page.locator('[data-testid="desktop-nav"] a[href="/en/blog"]');
    await expect(blogLink).not.toHaveAttribute('aria-current', 'page');
  });

  test('Blog link is active on blog page', async ({ page }) => {
    await page.goto(BLOG);
    await page.waitForLoadState('networkidle');

    const blogLink = page.locator('[data-testid="desktop-nav"] a[href="/en/blog"]');
    await expect(blogLink).toHaveAttribute('aria-current', 'page');

    const homeLink = page.locator('[data-testid="desktop-nav"] a[href="/en"]');
    await expect(homeLink).not.toHaveAttribute('aria-current', 'page');
  });

  test('Manifest link is active on manifest page', async ({ page }) => {
    await page.goto(MANIFEST);
    await page.waitForLoadState('networkidle');

    const manifestLink = page.locator('[data-testid="desktop-nav"] a[href="/en/manifest"]');
    await expect(manifestLink).toHaveAttribute('aria-current', 'page');
  });

  test('only one nav link is active at a time', async ({ page }) => {
    await page.goto(BLOG);
    await page.waitForLoadState('networkidle');

    const activeLinks = page.locator('[data-testid="desktop-nav"] a[aria-current="page"]');
    await expect(activeLinks).toHaveCount(1);
  });

  test('active state updates after SPA navigation', async ({ page }) => {
    await page.goto(HOME);
    await page.waitForLoadState('networkidle');

    const homeLink = page.locator('[data-testid="desktop-nav"] a[href="/en"]');
    await expect(homeLink).toHaveAttribute('aria-current', 'page');

    const blogLink = page.locator('[data-testid="desktop-nav"] a[href="/en/blog"]');
    await blogLink.click();
    await page.waitForURL('**/blog');

    await expect(blogLink).toHaveAttribute('aria-current', 'page');
    await expect(homeLink).not.toHaveAttribute('aria-current', 'page');
  });
});
