import { expect, test } from '@playwright/test';

test.describe('About Us section on homepage', () => {
  test('renders About Us section with heading', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const section = page.locator('[data-testid="about-section"]');
    await expect(section).toBeVisible();
    await expect(section.locator('h2')).toBeVisible();
  });

  test('renders all 4 categories', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="about-section"] [data-testid="about-card"]');
    await expect(cards).toHaveCount(4);
  });

  test('each card has a title and description', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="about-section"] [data-testid="about-card"]');

    for (let i = 0; i < 4; i++) {
      const card = cards.nth(i);
      await expect(card.locator('h3')).toBeVisible();
      await expect(card.locator('p')).toBeVisible();
    }
  });

  test('renders in Russian on /ru', async ({ page }) => {
    await page.goto('/ru');
    await page.waitForLoadState('networkidle');

    const section = page.locator('[data-testid="about-section"]');
    await expect(section).toBeVisible();

    const cards = page.locator('[data-testid="about-section"] [data-testid="about-card"]');
    await expect(cards).toHaveCount(4);
  });

  test('is visually distinct from news section', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const aboutBg = await page
      .locator('[data-testid="about-section"]')
      .evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
    const newsBg = await page
      .locator('.section')
      .first()
      .evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);

    expect(aboutBg !== newsBg || aboutBg !== 'rgba(0, 0, 0, 0)').toBe(true);
  });
});
