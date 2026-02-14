import { expect, test } from '@playwright/test';

/**
 * Accent color E2E tests.
 *
 * Verifies that the accent color is orange-red (not blue/purple)
 * in both light and dark themes.
 */

const isOrangeRed = (rgb: string): boolean => {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return false;
  const [, r, g, b] = match.map(Number);
  return r > 150 && g < 120 && b < 80;
};

test.describe('Accent color', () => {
  test('accent color is orange-red in light theme', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const accent = await page.evaluate(() =>
      globalThis
        .getComputedStyle(globalThis.document.documentElement)
        .getPropertyValue('--color-accent')
        .trim(),
    );

    expect(accent).toMatch(/hsl/);
    expect(accent).not.toContain('250');

    const accentRgb = await page.evaluate(() => {
      const el = globalThis.document.createElement('div');
      el.style.color = globalThis
        .getComputedStyle(globalThis.document.documentElement)
        .getPropertyValue('--color-accent');
      globalThis.document.body.appendChild(el);
      const rgb = globalThis.getComputedStyle(el).color;
      el.remove();
      return rgb;
    });

    expect(isOrangeRed(accentRgb)).toBe(true);
  });

  test('accent color is orange-red in dark theme', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      globalThis.document.documentElement.setAttribute('data-theme', 'dark');
    });

    const accent = await page.evaluate(() =>
      globalThis
        .getComputedStyle(globalThis.document.documentElement)
        .getPropertyValue('--color-accent')
        .trim(),
    );

    expect(accent).toMatch(/hsl/);
    expect(accent).not.toContain('250');

    const accentRgb = await page.evaluate(() => {
      const el = globalThis.document.createElement('div');
      el.style.color = globalThis
        .getComputedStyle(globalThis.document.documentElement)
        .getPropertyValue('--color-accent');
      globalThis.document.body.appendChild(el);
      const rgb = globalThis.getComputedStyle(el).color;
      el.remove();
      return rgb;
    });

    expect(isOrangeRed(accentRgb)).toBe(true);
  });

  test('primary buttons use accent color as background', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const btn = page.locator('.primary').first();
    const bg = await btn.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
    expect(isOrangeRed(bg)).toBe(true);
  });
});
