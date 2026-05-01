import { click, expect, type Page, test, visit, waitForCondition } from '@prometheus/e2e-toolkit';

/**
 * Theme toggle E2E tests.
 *
 * Covers:
 * 1. Theme toggle switches data-theme attribute
 * 2. Theme persists across SPA navigation
 * 3. Theme persists on hard reload
 * 4. Animation isolation — toggle does not move main, nav DOES animate
 * 5. SPA nav does not flash light styles in dark theme
 * 6. Theme colors differ between light and dark
 *
 * The previous shape of this file leaned heavily on `waitForTimeout`
 * to "let the animation play". The new shape waits on the actual
 * end state of each animation (data-theme flip, dataset cookie write,
 * or `Animation.finished`), so each test resolves in milliseconds.
 */

const BASE = '/en';

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset['theme']);

const storedTheme = (page: Page) => page.evaluate(() => localStorage.getItem('theme'));

const toggle = async (page: Page): Promise<void> => {
  await click(page, page.locator('[data-theme-toggle]').first());
};

/**
 * Wait until every CSS animation currently active on the page has
 * finished. Uses Animation.finished promises — no polling and no
 * artificial delay.
 */
const animationsSettled = (page: Page): Promise<void> =>
  page.evaluate(async () => {
    const anims = document.getAnimations();
    await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
  });

const setTheme = (page: Page, value: 'light' | 'dark'): Promise<void> =>
  page.evaluate((v) => {
    localStorage.setItem('theme', v);
    document.documentElement.dataset['theme'] = v;
  }, value);

test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, BASE);
  });

  test('switches between light and dark', async ({ page }) => {
    const initial = await theme(page);
    await toggle(page);
    await waitForCondition(page, async () => (await theme(page)) !== initial);
    expect(await theme(page)).not.toBe(initial);
    await toggle(page);
    await waitForCondition(page, async () => (await theme(page)) === initial);
    expect(await theme(page)).toBe(initial);
  });

  test('persists theme in localStorage', async ({ page }) => {
    await toggle(page);
    await waitForCondition(page, async () => (await storedTheme(page)) === (await theme(page)));
    const t = await theme(page);
    expect(await storedTheme(page)).toBe(t);
  });
});

test.describe('Theme persistence', () => {
  test('survives SPA navigation', async ({ page }) => {
    await visit(page, BASE);
    await setTheme(page, 'dark');
    await click(page, page.locator('[data-testid="desktop-nav"] a:has-text("Blog")'));
    await waitForCondition(page, async () => /\/blog/.test(page.url()));
    expect(await theme(page)).toBe('dark');
  });

  test('survives hard reload', async ({ page }) => {
    await visit(page, BASE);
    await setTheme(page, 'dark');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForCondition(page, async () => (await theme(page)) === 'dark');
    expect(await theme(page)).toBe('dark');
  });
});

test.describe('Animation isolation', () => {
  test('theme toggle does not move main content', async ({ page }) => {
    await visit(page, BASE);
    await toggle(page);
    const stamp = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;
      const cs = getComputedStyle(main);
      return { transform: cs.transform, opacity: cs.opacity };
    });
    expect(stamp).toBeTruthy();
    expect(stamp?.transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    expect(stamp?.opacity).toBe('1');
  });

  test('navigation triggers a screen change', async ({ page }) => {
    await visit(page, BASE);
    const before = await page.screenshot();
    await click(page, page.locator('[data-testid="desktop-nav"] a:has-text("Blog")'));
    await waitForCondition(page, async () => /\/blog/.test(page.url()));
    await animationsSettled(page);
    const after = await page.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });
});

test.describe('SPA navigation color flash', () => {
  test('category buttons do not flash light when navigating to blog in dark theme', async ({
    page,
  }) => {
    await visit(page, BASE);
    await setTheme(page, 'dark');

    await page.evaluate(() => {
      const log: Array<{
        event: string;
        dataTheme: string | undefined;
        buttons: Array<{ className: string; bg: string }>;
      }> = [];
      const capture = (event: string): void => {
        const btns = document.querySelectorAll('.category-btn:not(.active)');
        log.push({
          event,
          dataTheme: document.documentElement.dataset['theme'],
          buttons: Array.from(btns).map((btn) => ({
            className: btn.className,
            bg: getComputedStyle(btn).backgroundColor,
          })),
        });
      };
      const observer = new MutationObserver(() => {
        if (document.querySelector('.category-btn')) {
          capture('mutation');
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      document.addEventListener('astro:after-swap', () => capture('after-swap'), { once: true });
      (globalThis as Record<string, unknown>)['__flashLog'] = log;
    });

    await click(page, page.locator('[data-testid="desktop-nav"] a:has-text("Blog")'));
    await waitForCondition(page, async () => /\/blog/.test(page.url()));

    type LogEntry = {
      event: string;
      dataTheme: string | undefined;
      buttons: Array<{ className: string; bg: string }>;
    };
    const log = await page.evaluate(
      () => (globalThis as Record<string, unknown>)['__flashLog'] as LogEntry[],
    );
    const flashes = log.flatMap((entry) =>
      entry.buttons
        .filter(
          (btn) =>
            entry.dataTheme !== 'dark' ||
            btn.bg.includes('255') ||
            btn.bg.includes('250') ||
            btn.bg.includes('248'),
        )
        .map((btn) => `${entry.event}:${btn.className}`),
    );
    expect(flashes).toHaveLength(0);
  });
});

test.describe('Theme visual consistency', () => {
  test('light theme colors differ from dark', async ({ page }) => {
    await visit(page, BASE);
    await setTheme(page, 'light');
    await waitForCondition(page, async () => (await theme(page)) === 'light');

    const sample = (): Promise<{
      htmlBg: string | undefined;
      headerBg: string | undefined;
    }> =>
      page.evaluate(() => {
        const cs = (sel: string): string | undefined => {
          const el = document.querySelector(sel);
          return el ? getComputedStyle(el).backgroundColor : undefined;
        };
        return {
          htmlBg: cs('html'),
          headerBg: cs('header'),
        };
      });

    const lightColors = await sample();
    expect(lightColors.htmlBg).toBeTruthy();
    expect(lightColors.headerBg).toBeTruthy();

    await setTheme(page, 'dark');
    await waitForCondition(page, async () => (await theme(page)) === 'dark');
    await animationsSettled(page);
    const darkColors = await sample();

    expect(darkColors.htmlBg).not.toBe(lightColors.htmlBg);
    expect(darkColors.headerBg).not.toBe(lightColors.headerBg);
  });
});
