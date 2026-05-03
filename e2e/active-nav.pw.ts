import {
  click,
  expectAttribute,
  expectCount,
  expectNotAttribute,
  test,
  visit,
} from '@prometheus/e2e-toolkit';

/**
 * Active navigation item E2E tests.
 *
 * Pinned to `ru` because that's the lang the master content corpus
 * carries every section we exercise (home + blog + manifest). After
 * PR #74 (empty-section gating) `/en/blog` 404s — using /ru avoids
 * the false negative without changing what's being tested.
 *
 * Covers:
 * 1. Home link is active on home page
 * 2. Blog link is active on blog page
 * 3. Manifest link is active on manifest page
 * 4. Active state updates after SPA navigation
 * 5. Only one link is active at a time
 */

const HOME = '/ru';
const BLOG = '/ru/blog';
const MANIFEST = '/ru/manifest';

test.describe('Active navigation item', () => {
  test('Home link is active on home page', async ({ page }) => {
    await visit(page, HOME);
    const home = page.locator('[data-testid="desktop-nav"] a[href="/ru"]');
    const blog = page.locator('[data-testid="desktop-nav"] a[href="/ru/blog"]');
    await expectAttribute(page, home, 'aria-current', 'page');
    await expectNotAttribute(page, blog, 'aria-current', 'page');
  });

  test('Blog link is active on blog page', async ({ page }) => {
    await visit(page, BLOG);
    const home = page.locator('[data-testid="desktop-nav"] a[href="/ru"]');
    const blog = page.locator('[data-testid="desktop-nav"] a[href="/ru/blog"]');
    await expectAttribute(page, blog, 'aria-current', 'page');
    await expectNotAttribute(page, home, 'aria-current', 'page');
  });

  test('Manifest link is active on manifest page', async ({ page }) => {
    await visit(page, MANIFEST);
    const link = page.locator('[data-testid="desktop-nav"] a[href="/ru/manifest"]');
    await expectAttribute(page, link, 'aria-current', 'page');
  });

  test('only one nav link is active at a time', async ({ page }) => {
    await visit(page, BLOG);
    const active = page.locator('[data-testid="desktop-nav"] a[aria-current="page"]');
    await expectCount(page, active, 1);
  });

  test('active state updates after SPA navigation', async ({ page }) => {
    await visit(page, HOME);
    const home = page.locator('[data-testid="desktop-nav"] a[href="/ru"]');
    const blog = page.locator('[data-testid="desktop-nav"] a[href="/ru/blog"]');
    await expectAttribute(page, home, 'aria-current', 'page');
    await click(page, blog);
    await expectAttribute(page, blog, 'aria-current', 'page');
    await expectNotAttribute(page, home, 'aria-current', 'page');
  });
});
