import { expect, test, visit } from '@prometheus/e2e-toolkit';

/**
 * Accent color E2E tests.
 *
 * Verifies that the accent color is orange-red (not blue/purple)
 * in both light and dark themes.
 */

const isOrangeRed = (rgb: string): boolean => {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return false;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  return r > 150 && g < 120 && b < 80;
};

const readAccent = (themeAttr: 'light' | 'dark' | undefined) =>
  `(() => {
    ${themeAttr ? `globalThis.document.documentElement.setAttribute('data-theme', '${themeAttr}');` : ''}
    const raw = globalThis
      .getComputedStyle(globalThis.document.documentElement)
      .getPropertyValue('--color-accent')
      .trim();
    const el = globalThis.document.createElement('div');
    el.style.color = raw;
    globalThis.document.body.appendChild(el);
    const rgb = globalThis.getComputedStyle(el).color;
    el.remove();
    return { raw, rgb };
  })()`;

test.describe('Accent color', () => {
  test('accent color is orange-red in light theme', async ({ page }) => {
    await visit(page, '/en');
    const { raw, rgb } = await page.evaluate<{
      readonly raw: string;
      readonly rgb: string;
    }>(readAccent(undefined));
    expect(raw).toMatch(/hsl/);
    expect(raw).not.toContain('250');
    expect(isOrangeRed(rgb)).toBe(true);
  });

  test('accent color is orange-red in dark theme', async ({ page }) => {
    await visit(page, '/en');
    const { raw, rgb } = await page.evaluate<{
      readonly raw: string;
      readonly rgb: string;
    }>(readAccent('dark'));
    expect(raw).toMatch(/hsl/);
    expect(raw).not.toContain('250');
    expect(isOrangeRed(rgb)).toBe(true);
  });

  test('primary buttons use accent color as background', async ({ page }) => {
    await visit(page, '/components-demo');
    const btn = page.locator('.primary').first();
    const bg = await btn.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
    expect(isOrangeRed(bg)).toBe(true);
  });
});
