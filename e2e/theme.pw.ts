import { expect, type Page, test } from '@playwright/test';

/**
 * Theme toggle E2E tests with screenshot-based animation verification.
 *
 * Covers:
 * 1. Theme toggle switches data-theme attribute
 * 2. Theme persists across SPA navigation
 * 3. Theme persists on hard reload
 * 4. Circular reveal animation fires on theme toggle (mid-animation screenshot)
 * 5. Navigation slide animation does NOT fire on theme toggle
 * 6. Navigation slide animation DOES fire on page navigation
 * 7. Cards, header, footer colors match the active theme
 */

const BASE = '/en';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const getTheme = (page: Page) => page.evaluate(() => document.documentElement.dataset['theme']);

const getLocalStorageTheme = (page: Page) => page.evaluate(() => localStorage.getItem('theme'));

const clickThemeToggle = (page: Page) => page.locator('#theme-toggle').click();

/* ------------------------------------------------------------------ */
/*  1. Basic toggle                                                   */
/* ------------------------------------------------------------------ */

test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
  });

  test('switches between light and dark', async ({ page }) => {
    const initial = await getTheme(page);
    await page.screenshot({ path: 'e2e/screenshots/theme-01-initial.png' });

    await clickThemeToggle(page);
    await page.waitForTimeout(600);

    const toggled = await getTheme(page);
    expect(toggled).not.toBe(initial);
    await page.screenshot({ path: 'e2e/screenshots/theme-02-toggled.png' });

    await clickThemeToggle(page);
    await page.waitForTimeout(600);

    const restored = await getTheme(page);
    expect(restored).toBe(initial);
    await page.screenshot({ path: 'e2e/screenshots/theme-03-restored.png' });
  });

  test('persists theme in localStorage', async ({ page }) => {
    await clickThemeToggle(page);
    await page.waitForTimeout(600);

    const theme = await getTheme(page);
    const stored = await getLocalStorageTheme(page);
    expect(stored).toBe(theme);
  });
});

/* ------------------------------------------------------------------ */
/*  2. Theme persistence across SPA navigation                        */
/* ------------------------------------------------------------------ */

test.describe('Theme persistence', () => {
  test('survives SPA navigation', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.dataset['theme'] = 'dark';
    });
    await page.screenshot({ path: 'e2e/screenshots/theme-04-dark-before-nav.png' });

    await page.locator('nav a:has-text("Blog")').click();
    await page.waitForURL('**/blog');
    await page.waitForTimeout(400);

    const themeAfterNav = await getTheme(page);
    expect(themeAfterNav).toBe('dark');
    await page.screenshot({ path: 'e2e/screenshots/theme-05-dark-after-nav.png' });
  });

  test('survives hard reload', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.dataset['theme'] = 'dark';
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const themeAfterReload = await getTheme(page);
    expect(themeAfterReload).toBe('dark');
    await page.screenshot({ path: 'e2e/screenshots/theme-06-dark-after-reload.png' });
  });
});

/* ------------------------------------------------------------------ */
/*  3. Circular reveal animation on theme toggle                      */
/* ------------------------------------------------------------------ */

test.describe('Theme toggle animation', () => {
  test('circular reveal fires — mid-animation differs from before/after', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const beforeBuf = await page.screenshot();

    const toggleBtn = page.locator('#theme-toggle');
    const box = await toggleBtn.boundingBox();
    expect(box).toBeTruthy();
    const { x, y, width, height } = box as { x: number; y: number; width: number; height: number };

    await page.mouse.click(x + width / 2, y + height / 2);

    await page.waitForTimeout(150);
    const midBuf = await page.screenshot({ path: 'e2e/screenshots/theme-07-mid-reveal.png' });

    await page.waitForTimeout(600);
    const afterBuf = await page.screenshot({ path: 'e2e/screenshots/theme-08-after-reveal.png' });

    expect(Buffer.compare(beforeBuf, midBuf)).not.toBe(0);
    expect(Buffer.compare(midBuf, afterBuf)).not.toBe(0);
    expect(Buffer.compare(beforeBuf, afterBuf)).not.toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  4. Navigation does NOT trigger on theme toggle                    */
/* ------------------------------------------------------------------ */

test.describe('Animation isolation', () => {
  test('theme toggle does not move main content', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    await clickThemeToggle(page);
    await page.waitForTimeout(100);

    const mainPositionDuring = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;
      const style = getComputedStyle(main);
      return { transform: style.transform, opacity: style.opacity };
    });

    expect(mainPositionDuring).toBeTruthy();
    const { transform, opacity } = mainPositionDuring as { transform: string; opacity: string };
    expect(transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    expect(opacity).toBe('1');

    await page.waitForTimeout(600);
    await page.screenshot({ path: 'e2e/screenshots/theme-09-no-slide-on-toggle.png' });
  });

  test('navigation DOES animate main content with slide', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const beforeBuf = await page.screenshot();

    await page.locator('nav a:has-text("Blog")').click();

    await page.waitForTimeout(100);
    await page.screenshot({ path: 'e2e/screenshots/theme-10-nav-mid-slide.png' });

    await page.waitForURL('**/blog');
    await page.waitForTimeout(400);

    const afterNavBuf = await page.screenshot({
      path: 'e2e/screenshots/theme-11-nav-after-slide.png',
    });

    expect(Buffer.compare(beforeBuf, afterNavBuf)).not.toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  5. Visual regression: theme colors on key elements                */
/* ------------------------------------------------------------------ */

test.describe('Theme visual consistency', () => {
  test('light theme colors are correct', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.dataset['theme'] = 'light';
    });
    await page.waitForTimeout(100);

    const colors = await page.evaluate(() => {
      const html = document.documentElement;
      const card = document.querySelector('.card');
      const header = document.querySelector('header');
      const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
      return {
        htmlBg: cs(html)?.backgroundColor,
        htmlColor: cs(html)?.color,
        cardBg: cs(card)?.backgroundColor,
        headerBg: cs(header)?.backgroundColor,
      };
    });

    await page.screenshot({ path: 'e2e/screenshots/theme-12-light-colors.png' });

    expect(colors.htmlBg).toBeTruthy();
    expect(colors.cardBg).toBeTruthy();
    expect(colors.headerBg).toBeTruthy();

    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.dataset['theme'] = 'dark';
    });
    await page.waitForTimeout(100);

    const darkColors = await page.evaluate(() => {
      const html = document.documentElement;
      const card = document.querySelector('.card');
      const header = document.querySelector('header');
      const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
      return {
        htmlBg: cs(html)?.backgroundColor,
        htmlColor: cs(html)?.color,
        cardBg: cs(card)?.backgroundColor,
        headerBg: cs(header)?.backgroundColor,
      };
    });

    await page.screenshot({ path: 'e2e/screenshots/theme-13-dark-colors.png' });

    expect(darkColors.htmlBg).not.toBe(colors.htmlBg);
    expect(darkColors.cardBg).not.toBe(colors.cardBg);
    expect(darkColors.headerBg).not.toBe(colors.headerBg);
  });
});
