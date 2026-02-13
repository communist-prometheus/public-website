import { expect, type Page, test } from '@playwright/test';

/**
 * Mobile menu and responsive layout E2E tests.
 *
 * Covers:
 * 1. Hamburger menu visibility on mobile viewport
 * 2. Desktop nav hidden on mobile
 * 3. Mobile menu open/close behavior
 * 4. Navigation works from mobile menu
 * 5. Menu closes on navigation
 * 6. Menu closes on ESC key
 * 7. Menu closes on overlay click
 * 8. Theme toggle accessible in mobile menu
 * 9. Responsive layout — no horizontal overflow
 * 10. Touch targets meet minimum size (44x44)
 */

const BASE = '/en';
const BLOG = '/en/blog';

const openMobileMenu = async (page: Page) => {
  const hamburger = page.locator('[data-testid="mobile-menu-toggle"]');
  await hamburger.click();
  await page.waitForTimeout(350);
};

const closeMobileMenu = async (page: Page) => {
  const closeBtn = page.locator('[data-testid="mobile-menu-close"]');
  await closeBtn.click();
  await page.waitForTimeout(350);
};

test.describe('Mobile menu visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
  });

  test('hamburger button is visible on mobile', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-toggle"]');
    await expect(hamburger).toBeVisible();
  });

  test('desktop nav is hidden on mobile', async ({ page }) => {
    const desktopNav = page.locator('[data-testid="desktop-nav"]');
    await expect(desktopNav).not.toBeVisible();
  });
});

test.describe('Mobile menu interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
  });

  test('opens and shows navigation links', async ({ page }) => {
    await openMobileMenu(page);

    const mobileNav = page.locator('[data-testid="mobile-menu-panel"]');
    await expect(mobileNav).toBeVisible();

    const links = mobileNav.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('closes on close button click', async ({ page }) => {
    await openMobileMenu(page);

    const mobileNav = page.locator('[data-testid="mobile-menu-panel"]');
    await expect(mobileNav).toBeVisible();

    await closeMobileMenu(page);
    await expect(mobileNav).not.toBeVisible();
  });

  test('closes on ESC key', async ({ page }) => {
    await openMobileMenu(page);

    const mobileNav = page.locator('[data-testid="mobile-menu-panel"]');
    await expect(mobileNav).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);

    await expect(mobileNav).not.toBeVisible();
  });

  test('closes on overlay click', async ({ page }) => {
    await openMobileMenu(page);

    const overlay = page.locator('[data-testid="mobile-menu-overlay"]');
    await expect(overlay).toBeVisible();

    await overlay.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(350);

    const mobileNav = page.locator('[data-testid="mobile-menu-panel"]');
    await expect(mobileNav).not.toBeVisible();
  });

  test('navigates and closes menu on link click', async ({ page }) => {
    await openMobileMenu(page);

    const blogLink = page.locator('[data-testid="mobile-menu-panel"] a:has-text("Blog")');
    await blogLink.click();
    await page.waitForURL('**/blog');

    const mobileNav = page.locator('[data-testid="mobile-menu-panel"]');
    await expect(mobileNav).not.toBeVisible();
  });

  test('theme toggle is accessible in mobile menu', async ({ page }) => {
    await openMobileMenu(page);

    const themeToggle = page.locator('[data-testid="mobile-menu-panel"] #theme-toggle');
    await expect(themeToggle).toBeVisible();
  });

  test('menu works after SPA navigation', async ({ page }) => {
    await openMobileMenu(page);

    const blogLink = page.locator('[data-testid="mobile-menu-panel"] a:has-text("Blog")');
    await blogLink.click();
    await page.waitForURL('**/blog');

    const panel = page.locator('[data-testid="mobile-menu-panel"]');
    await expect(panel).not.toBeVisible({ timeout: 2000 });

    await openMobileMenu(page);
    await expect(panel).toBeVisible();

    const links = panel.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(3);

    await closeMobileMenu(page);
    await expect(panel).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('Mobile menu accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
  });

  test('hamburger button has proper aria attributes', async ({ page }) => {
    const hamburger = page.locator('[data-testid="mobile-menu-toggle"]');
    await expect(hamburger).toHaveAttribute('aria-label', /menu/i);
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    await hamburger.click();
    await page.waitForTimeout(350);

    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
  });

  test('mobile menu panel has proper role', async ({ page }) => {
    await openMobileMenu(page);

    const panel = page.locator('[data-testid="mobile-menu-panel"]');
    await expect(panel).toHaveAttribute('role', 'dialog');
    await expect(panel).toHaveAttribute('aria-modal', 'true');
  });
});

test.describe('Responsive layout', () => {
  test('no horizontal overflow on home page', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test('no horizontal overflow on blog page', async ({ page }) => {
    await page.goto(BLOG);
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test('all interactive elements meet minimum touch target size (44x44)', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const smallTargets = await page.evaluate(() => {
      const interactiveSelectors = 'a, button, input, select, textarea, [role="button"]';
      const elements = document.querySelectorAll(interactiveSelectors);
      const violations: Array<{ tag: string; text: string; width: number; height: number }> = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        if (rect.width < 44 || rect.height < 44) {
          violations.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent ?? '').trim().slice(0, 30),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
      return violations;
    });

    if (smallTargets.length > 0) {
      console.log('\n=== Touch target violations ===');
      for (const v of smallTargets) {
        console.log(`  <${v.tag}> "${v.text}" — ${v.width}x${v.height}px`);
      }
      console.log('===============================\n');
    }

    expect(smallTargets, `${smallTargets.length} elements below 44x44px minimum`).toHaveLength(0);
  });

  test('cards stack vertically on mobile', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const cardPositions = await page.evaluate(() => {
      const cards = document.querySelectorAll('.card, .post-card');
      return Array.from(cards).map((card) => {
        const rect = card.getBoundingClientRect();
        return { top: rect.top, left: rect.left, width: rect.width };
      });
    });

    if (cardPositions.length >= 2) {
      for (let i = 1; i < cardPositions.length; i++) {
        const prev = cardPositions[i - 1];
        const curr = cardPositions[i];
        if (prev && curr) {
          expect(curr.top).toBeGreaterThan(prev.top);
        }
      }
    }
  });
});
