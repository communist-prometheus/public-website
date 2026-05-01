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
    await expectText(page, page.locator('h1'), 'Welcome to Prometheus');
    await expectText(page, page.locator('[data-testid="positions-widget"] h2'), 'Positions');
    await expectText(page, page.locator('footer'), '© All rights reserved');
  });

  test('blog page renders English chrome', async ({ page }) => {
    await visit(page, '/en/blog');
    await expectText(page, page.locator('h1'), 'Blog');
    /*
     * /en/blog has no posts in prod — only ru/it carry content,
     * so the category filter chips aren't rendered. The "Read
     * more" + filter assertions live in the Russian variant below.
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
  test('positions page uses common readMore label', async ({ page }) => {
    await visit(page, '/en/positions');
    await expectText(page, page.locator('h1'), 'Positions');
    await expectVisible(page, page.locator('text=Read more').first());
  });

  test('position detail uses common backToList label', async ({ page }) => {
    await visit(page, '/en/positions/digital-sovereignty');
    await expectText(page, page.locator('.back-link'), 'Back');
  });

  test('home page positions widget uses common viewAll label', async ({ page }) => {
    await visit(page, '/en');
    await expectText(page, page.locator('[data-testid="positions-widget"]'), 'View all');
  });
});

test.describe('Translations - Russian', () => {
  test('home page renders Russian content', async ({ page }) => {
    await visit(page, '/ru');
    await expectText(page, page.locator('h1'), 'Добро пожаловать в Prometheus');
    await expectText(page, page.locator('[data-testid="positions-widget"] h2'), 'Позиции');
    await expectVisible(page, page.locator('text=Последние новости'));
    await expectVisible(page, page.locator('text=Все посты'));
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
