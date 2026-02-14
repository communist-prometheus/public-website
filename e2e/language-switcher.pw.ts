import { expect, test } from '@playwright/test';

const desktopNav = '[data-testid="desktop-nav"]';

test.describe('Language switcher - Desktop', () => {
  const switcherSel = 'header .desktop-only [data-testid="language-switcher"]';

  test('switcher is visible in header', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await expect(page.locator(switcherSel)).toBeVisible();
  });

  test('shows current language label', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await expect(page.locator(switcherSel)).toContainText('EN');
  });

  test('switches from EN to RU and navigates to equivalent page', async ({ page }) => {
    await page.goto('/en/blog');
    await page.waitForLoadState('networkidle');

    const switcher = page.locator(switcherSel);
    await switcher.click();

    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await expect(ruOption).toBeVisible();
    await ruOption.click();

    await page.waitForURL('**/ru/blog');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('switches from RU to EN and navigates to equivalent page', async ({ page }) => {
    await page.goto('/ru/manifest');
    await page.waitForLoadState('networkidle');

    const switcher = page.locator(switcherSel);
    await switcher.click();

    const enOption = switcher.locator('[data-testid="lang-option-en"]');
    await expect(enOption).toBeVisible();
    await enOption.click();

    await page.waitForURL('**/en/manifest');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('preserves path segments when switching language on home page', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const switcher = page.locator(switcherSel);
    await switcher.click();

    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await ruOption.click();

    await page.waitForURL('**/ru');
    await expect(page).toHaveURL(/\/ru\/?$/);
  });

  test('dropdown closes when clicking outside', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const switcher = page.locator(switcherSel);
    await switcher.click();

    const dropdown = switcher.locator('[data-testid="language-dropdown"]');
    await expect(dropdown).toBeVisible();

    await page.locator('h1').click();
    await expect(dropdown).not.toBeVisible();
  });

  test('is keyboard navigable', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const trigger = page.locator(`${switcherSel} .lang-trigger`);
    await trigger.focus();
    await page.keyboard.press('Enter');

    const dropdown = page.locator(`${switcherSel} [data-testid="language-dropdown"]`);
    await expect(dropdown).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dropdown).not.toBeVisible();
  });

  test('works after SPA navigation', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.locator(`${desktopNav} a[href="/en/blog"]`).click();
    await page.waitForURL('**/en/blog');

    const switcher = page.locator(switcherSel);
    await switcher.click();

    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await expect(ruOption).toBeVisible();
    await ruOption.click();

    await page.waitForURL('**/ru/blog');
  });
});
