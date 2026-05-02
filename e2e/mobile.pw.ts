import {
  click,
  expect,
  expectAttribute,
  expectHidden,
  expectMinCount,
  expectVisible,
  type Page,
  pressKey,
  test,
  visit,
  waitForCondition,
} from '@prometheus/e2e-toolkit';

/**
 * Mobile menu and responsive layout E2E tests.
 *
 * Every "wait for the menu animation" call is now a wait on the
 * actual end state — `aria-expanded` flipping, the panel becoming
 * visible/hidden — instead of an opaque 350 ms timer.
 */

const BASE = '/en';
const BLOG = '/en/blog';

const openMobileMenu = async (page: Page): Promise<void> => {
  await click(page, page.locator('[data-testid="mobile-menu-toggle"]'));
  await expectVisible(page, page.locator('[data-testid="mobile-menu-panel"]'));
};

const closeMobileMenu = async (page: Page): Promise<void> => {
  // Mirror admin's draggable-FAB pattern: same button toggles open/close.
  await click(page, page.locator('[data-testid="mobile-menu-toggle"]'));
  await expectHidden(page, page.locator('[data-testid="mobile-menu-panel"]'));
};

test.describe('Mobile menu visibility', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, BASE);
  });

  test('hamburger button is visible on mobile', async ({ page }) => {
    await expectVisible(page, page.locator('[data-testid="mobile-menu-toggle"]'));
  });

  test('desktop nav is hidden on mobile', async ({ page }) => {
    await expectHidden(page, page.locator('[data-testid="desktop-nav"]'));
  });
});

test.describe('Mobile menu interaction', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, BASE);
  });

  test('opens and shows navigation links', async ({ page }) => {
    await openMobileMenu(page);
    const links = page.locator('[data-testid="mobile-menu-panel"] a');
    await expectMinCount(page, links, 3);
  });

  test('FAB toggles menu closed when clicked while open', async ({ page }) => {
    await openMobileMenu(page);
    await closeMobileMenu(page);
  });

  test('closes on ESC key', async ({ page }) => {
    await openMobileMenu(page);
    await pressKey(page, 'Escape');
    await expectHidden(page, page.locator('[data-testid="mobile-menu-panel"]'));
  });

  test('closes on overlay click', async ({ page }) => {
    await openMobileMenu(page);
    const overlay = page.locator('[data-testid="mobile-menu-overlay"]');
    await expectVisible(page, overlay);
    await overlay.click({ position: { x: 10, y: 10 } });
    await expectHidden(page, page.locator('[data-testid="mobile-menu-panel"]'));
  });

  test('navigates and closes menu on link click', async ({ page }) => {
    await openMobileMenu(page);
    const blogLink = page.locator('[data-testid="mobile-menu-panel"] a:has-text("Blog")');
    await click(page, blogLink);
    await waitForCondition(page, async () => /\/blog/.test(page.url()));
    await expectHidden(page, page.locator('[data-testid="mobile-menu-panel"]'));
  });

  test('theme toggle is accessible in mobile menu', async ({ page }) => {
    await openMobileMenu(page);
    const themeToggle = page.locator('[data-testid="mobile-menu-panel"] [data-theme-toggle]');
    await expectVisible(page, themeToggle);
  });

  test('menu works after SPA navigation', async ({ page }) => {
    await openMobileMenu(page);
    const blogLink = page.locator('[data-testid="mobile-menu-panel"] a:has-text("Blog")');
    await click(page, blogLink);
    await waitForCondition(page, async () => /\/blog/.test(page.url()));
    await expectHidden(page, page.locator('[data-testid="mobile-menu-panel"]'));
    await openMobileMenu(page);
    await expectMinCount(page, page.locator('[data-testid="mobile-menu-panel"] a'), 3);
    await closeMobileMenu(page);
  });
});

test.describe('Mobile menu accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, BASE);
  });

  test('hamburger button has proper aria attributes', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-toggle"]');
    await expectAttribute(page, hamburger, 'aria-label', /menu/i);
    await expectAttribute(page, hamburger, 'aria-expanded', 'false');
    await click(page, hamburger);
    await expectAttribute(page, hamburger, 'aria-expanded', 'true');
  });

  test('mobile menu panel has proper role', async ({ page }) => {
    await openMobileMenu(page);
    const panel = page.locator('[data-testid="mobile-menu-panel"]');
    await expectAttribute(page, panel, 'role', 'dialog');
    await expectAttribute(page, panel, 'aria-modal', 'true');
  });
});

test.describe('Mobile menu controls', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, BASE);
  });

  test('theme toggle changes theme in mobile menu', async ({ page }) => {
    const initial = await page.evaluate(() => document.documentElement.dataset['theme']);
    await openMobileMenu(page);
    const themeBtn = page.locator('[data-testid="mobile-menu-panel"] [data-theme-toggle]');
    await expectVisible(page, themeBtn);
    await click(page, themeBtn);
    await waitForCondition(
      page,
      async () =>
        (await page.evaluate(() => document.documentElement.dataset['theme'])) !== initial,
    );
  });

  test('language switcher is visible in mobile menu', async ({ page }) => {
    await openMobileMenu(page);
    const switcher = page.locator(
      '[data-testid="mobile-menu-panel"] [data-testid="language-switcher"]',
    );
    await expectVisible(page, switcher);
  });

  test('language dropdown stays inside the viewport when opened in mobile menu', async ({
    page,
  }) => {
    /*
     * The desktop dropdown opens downward; inside the FAB popup
     * (anchored to the bottom-right corner by default) that puts
     * the list off-screen. Mobile menu now flips the dropdown to
     * open upward via [data-corner^=bottom-]. Asserts the dropdown
     * box lands fully within the viewport rectangle.
     */
    await openMobileMenu(page);
    const switcher = page.locator(
      '[data-testid="mobile-menu-panel"] [data-testid="language-switcher"]',
    );
    await click(page, switcher.locator('.lang-trigger'));
    const dropdown = switcher.locator('[data-testid="language-dropdown"]');
    await expectVisible(page, dropdown);
    const fitsViewport = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="mobile-menu-panel"] [data-testid="language-dropdown"]',
      );
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      return r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw;
    });
    expect(fitsViewport).toBe(true);
  });

  test('language switcher navigates to another language from mobile menu', async ({ page }) => {
    await openMobileMenu(page);
    const switcher = page.locator(
      '[data-testid="mobile-menu-panel"] [data-testid="language-switcher"]',
    );
    await click(page, switcher.locator('.lang-trigger'));
    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await expectVisible(page, ruOption);
    await click(page, ruOption);
    await waitForCondition(page, async () => /\/ru\/?$/.test(page.url()));
    await expect(page).toHaveURL(/\/ru\/?$/);
  });
});

test.describe('Responsive layout', () => {
  test('no horizontal overflow on home page', async ({ page }) => {
    await visit(page, BASE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('no horizontal overflow on blog page', async ({ page }) => {
    await visit(page, BLOG);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('all interactive elements meet minimum touch target size (44x44)', async ({ page }) => {
    await visit(page, BASE);
    const small = await page.evaluate(() => {
      const sel = 'a, button, input, select, textarea, [role="button"]';
      const list: Array<{
        tag: string;
        text: string;
        width: number;
        height: number;
      }> = [];
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        /*
         * Skip-to-main and similar focus-only elements are parked
         * off-viewport until focus, so they can never be tapped.
         */
        if (r.bottom <= 0 || r.right <= 0) continue;
        if (r.width < 44 || r.height < 44) {
          list.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent ?? '').trim().slice(0, 30),
            width: Math.round(r.width),
            height: Math.round(r.height),
          });
        }
      }
      return list;
    });
    expect(small, `${small.length} elements below 44x44px minimum`).toHaveLength(0);
  });

  test('cards stack vertically on mobile', async ({ page }) => {
    await visit(page, BASE);
    const positions = await page.evaluate(() => {
      const cards = document.querySelectorAll('.card, .post-card');
      return Array.from(cards).map((c) => {
        const r = c.getBoundingClientRect();
        return { top: r.top, left: r.left, width: r.width };
      });
    });
    if (positions.length >= 2) {
      for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];
        if (prev && curr) {
          expect(curr.top).toBeGreaterThan(prev.top);
        }
      }
    }
  });
});
