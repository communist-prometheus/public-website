import { expect, test } from '@playwright/test';

test.describe('Positions section', () => {
  test('positions listing page renders with heading', async ({ page }) => {
    await page.goto('/en/positions');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toHaveText('Positions');
  });

  test('positions listing shows position cards', async ({ page }) => {
    await page.goto('/en/positions');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="position-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('clicking a position card navigates to detail page', async ({ page }) => {
    await page.goto('/en/positions');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('[data-testid="position-card"] a').first();
    const href = await firstCard.getAttribute('href');
    await firstCard.click();

    await page.waitForURL(`**${href}`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('individual position page renders content', async ({ page }) => {
    await page.goto('/en/positions');
    await page.waitForLoadState('networkidle');

    const firstLink = page.locator('[data-testid="position-card"] a').first();
    const href = await firstLink.getAttribute('href');
    await firstLink.click();
    await page.waitForURL(`**${href}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.content')).toBeVisible();
  });

  test('positions listing page renders in Russian', async ({ page }) => {
    await page.goto('/ru/positions');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toHaveText('Позиции');

    const cards = page.locator('[data-testid="position-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('navigation contains Positions link', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="desktop-nav"]');
    await expect(nav.locator('a[href="/en/positions"]')).toBeVisible();
  });

  test('positions widget is visible on homepage', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const widget = page.locator('[data-testid="positions-widget"]');
    await expect(widget).toBeVisible();
    await expect(widget.locator('h2')).toBeVisible();

    const cards = widget.locator('[data-testid="position-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
