import { expect, test } from '@playwright/test';

/**
 * E2E tests for Italian and Spanish language support.
 *
 * Verifies that both new languages render correctly across all pages.
 */

const languages = [
  { code: 'it', label: 'Italiano', nav: { home: 'Home', blog: 'Blog', manifest: 'Manifesto' } },
  { code: 'es', label: 'Español', nav: { home: 'Inicio', blog: 'Blog', manifest: 'Manifiesto' } },
] as const;

for (const lang of languages) {
  test.describe(`${lang.label} (${lang.code}) language support`, () => {
    test('home page renders translated content', async ({ page }) => {
      await page.goto(`/${lang.code}`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });

    test('blog page renders translated heading', async ({ page }) => {
      await page.goto(`/${lang.code}/blog`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      const cards = page.locator('.post-card');
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('manifest page renders content', async ({ page }) => {
      await page.goto(`/${lang.code}/manifest`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
    });

    test('navigation renders translated labels', async ({ page }) => {
      await page.goto(`/${lang.code}`);
      await page.waitForLoadState('networkidle');

      const nav = page.locator('[data-testid="desktop-nav"]');
      await expect(nav.locator(`a[href="/${lang.code}"]`)).toHaveText(lang.nav.home);
      await expect(nav.locator(`a[href="/${lang.code}/blog"]`)).toHaveText(lang.nav.blog);
      await expect(nav.locator(`a[href="/${lang.code}/manifest"]`)).toHaveText(lang.nav.manifest);
    });

    test('language switcher shows option', async ({ page }) => {
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      const switcher = page.locator('header .desktop-only [data-testid="language-switcher"]');
      await switcher.click();

      const option = switcher.locator(`[data-testid="lang-option-${lang.code}"]`);
      await expect(option).toBeVisible();
      await expect(option).toHaveText(lang.label);
    });

    test('language switcher navigates to correct page', async ({ page }) => {
      await page.goto('/en/blog');
      await page.waitForLoadState('networkidle');

      const switcher = page.locator('header .desktop-only [data-testid="language-switcher"]');
      await switcher.click();

      const option = switcher.locator(`[data-testid="lang-option-${lang.code}"]`);
      await option.click();

      await page.waitForURL(`**/${lang.code}/blog`);
      await expect(page.locator('h1')).toBeVisible();
    });
  });
}
