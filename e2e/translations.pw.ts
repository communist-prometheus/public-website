import { expect, test } from '@playwright/test';

/**
 * Translation E2E tests.
 *
 * Verifies that all pages render correct translations for both EN and RU.
 */

test.describe('Translations - English', () => {
  test('home page renders English content', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toHaveText('Welcome to Prometheus');
    await expect(page.locator('[data-testid="positions-widget"] h2')).toHaveText('Positions');
    await expect(page.locator('text=Latest News')).toBeVisible();
    await expect(page.locator('text=View all posts')).toBeVisible();
    await expect(page.locator('footer')).toContainText('© All rights reserved');
  });

  test('blog page renders English content', async ({ page }) => {
    await page.goto('/en/blog');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toHaveText('Blog');
    await expect(page.locator('.category-btn[data-category="all"]')).toHaveText('All');
    // /en/blog has no posts in prod — only ru/it carry content. The post
    // card "Read more" assertion lives in the Russian variant below.
  });

  test('navigation renders English labels', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="desktop-nav"]');
    await expect(nav.locator('a[href="/en"]')).toHaveText('Home');
    await expect(nav.locator('a[href="/en/blog"]')).toHaveText('Blog');
    await expect(nav.locator('a[href="/en/manifest"]')).toHaveText('Manifest');
  });
});

test.describe('Translations - Common Labels', () => {
  test('positions page uses common readMore label', async ({ page }) => {
    await page.goto('/en/positions');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toHaveText('Positions');
    await expect(page.locator('text=Read more').first()).toBeVisible();
  });

  test('position detail uses common backToList label', async ({ page }) => {
    await page.goto('/en/positions/digital-sovereignty');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.back-link')).toContainText('Back');
  });

  test('home page positions widget uses common viewAll label', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="positions-widget"]')).toContainText('View all');
  });
});

test.describe('Translations - Russian', () => {
  test('home page renders Russian content', async ({ page }) => {
    await page.goto('/ru');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toHaveText('Добро пожаловать в Prometheus');
    await expect(page.locator('[data-testid="positions-widget"] h2')).toHaveText('Позиции');
    await expect(page.locator('text=Последние новости')).toBeVisible();
    await expect(page.locator('text=Все посты')).toBeVisible();
    await expect(page.locator('footer')).toContainText('© Все права защищены');
  });

  test('blog page renders Russian content', async ({ page }) => {
    await page.goto('/ru/blog');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toHaveText('Блог');
    await expect(page.locator('.category-btn[data-category="all"]')).toHaveText('Все');
    await expect(page.locator('text=Читать далее').first()).toBeVisible();
  });

  test('navigation renders Russian labels', async ({ page }) => {
    await page.goto('/ru');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="desktop-nav"]');
    await expect(nav.locator('a[href="/ru"]')).toHaveText('Главная');
    await expect(nav.locator('a[href="/ru/blog"]')).toHaveText('Блог');
    await expect(nav.locator('a[href="/ru/manifest"]')).toHaveText('Манифест');
  });
});
