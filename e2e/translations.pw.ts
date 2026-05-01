import { expectText, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/**
 * Translation E2E tests.
 *
 * Verifies that all pages render correct translations for both
 * EN and RU.
 */

test.describe('Translations - English', () => {
  test('home page renders English content', async ({ page }) => {
    await visit(page, '/en');
    await expectText(page, page.locator('h1'), 'Communist Prometheus');
    /*
     * The positions-widget renders only when the editor has at
     * least one published position. Footer + h1 are the
     * content-agnostic chrome.
     */
    await expectText(page, page.locator('footer'), '© All rights reserved');
  });

  test('blog page renders English chrome', async ({ page }) => {
    await visit(page, '/en/blog');
    await expectText(page, page.locator('h1'), 'Blog');
    /*
     * /en/blog has no posts in prod — only ru/it carry content, so
     * the category filter chips aren't rendered. The "Read more" +
     * filter assertions live in the Russian variant below.
     */
  });

  test('navigation renders English labels', async ({ page }) => {
    await visit(page, '/en');
    const nav = page.locator('[data-testid="desktop-nav"]');
    await expectText(page, nav.locator('a[href="/en"]'), 'Home');
    await expectText(page, nav.locator('a[href="/en/blog"]'), 'Blog');
    await expectText(page, nav.locator('a[href="/en/manifest"]'), 'Manifest');
  });
});

test.describe('Translations - Common Labels', () => {
  test('positions page chrome uses heading', async ({ page }) => {
    await visit(page, '/en/positions');
    await expectText(page, page.locator('h1'), 'Positions');
    /*
     * The readMore assertion used to fire here, but positions are
     * editorial content that the admin can fully empty — currently
     * the list is empty in prod, so the "Read more" CTA isn't
     * rendered. The chrome assertion is the content-agnostic part.
     */
  });

  test('home page renders without crashing', async ({ page }) => {
    await visit(page, '/en');
    await expectVisible(page, page.locator('h1'));
    /*
     * The positions-widget assertion was content-pinned and the
     * widget renders only when the editor has at least one
     * published position. The chrome assertion covers the
     * content-agnostic part.
     */
  });
});

test.describe('Translations - Russian', () => {
  test('home page renders Russian content', async ({ page }) => {
    await visit(page, '/ru');
    await expectText(page, page.locator('h1'), 'Коммунистический Прометей');
    await expectText(page, page.locator('footer'), '© Все права защищены');
  });

  test('blog page renders Russian content', async ({ page }) => {
    await visit(page, '/ru/blog');
    await expectText(page, page.locator('h1'), 'Блог');
    await expectText(page, page.locator('.category-btn[data-category="all"]'), 'Все');
    await expectVisible(page, page.locator('text=Читать далее').first());
  });

  test('navigation renders Russian labels', async ({ page }) => {
    await visit(page, '/ru');
    const nav = page.locator('[data-testid="desktop-nav"]');
    await expectText(page, nav.locator('a[href="/ru"]'), 'Главная');
    await expectText(page, nav.locator('a[href="/ru/blog"]'), 'Блог');
    await expectText(page, nav.locator('a[href="/ru/manifest"]'), 'Манифест');
  });
});
