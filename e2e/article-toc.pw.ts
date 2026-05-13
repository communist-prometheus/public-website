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
} from '@prometheus/e2e-toolkit';

/*
 * Article-page table-of-contents E2E.
 *
 * Asserts the contract for both layout modes:
 * - Desktop (≥1280px): pinned left rail, nav always visible, no FAB.
 * - Mobile / narrow desktop: floating FAB visible, nav hidden until
 * FAB tap; backdrop, Escape and link click all dismiss the panel.
 *
 * Target article: `programme-outline` (RU) — the only currently
 * published article in the content repo with ≥5 h2/h3 sections,
 * which `expectMinCount(..., 5)` below requires. The previous
 * target `/en/blog/astro-framework` was removed from the content
 * repo months ago; the test suite still pointed at it because the
 * deploy gate had been silently bypassed by `content:`-prefixed
 * commits. If `programme-outline` moves, repoint at any published
 * article that ships ≥5 sub-headings (count via
 * `git ls-tree -r origin/master --name-only | grep '^blog/.*\\.md$'`
 * + `grep -cE '^#{2,3}\\s'`).
 */

const ARTICLE = '/ru/blog/programme-outline';

const TOC = '[data-testid="article-toc"]';
const TOGGLE = '[data-testid="article-toc-toggle"]';
const BACKDROP = '[data-testid="article-toc-backdrop"]';

const openMobilePanel = async (page: Page): Promise<void> => {
  await click(page, page.locator(TOGGLE));
  await expectAttribute(page, page.locator(TOGGLE), 'aria-expanded', 'true');
};

test.describe('Article TOC — desktop rail', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test('renders next to the article with all h2/h3 headings', async ({ page }) => {
    await visit(page, ARTICLE);
    const toc = page.locator(TOC);
    await expectVisible(page, toc);
    await expectVisible(page, toc.locator('.article-toc-heading'));
    await expectMinCount(page, toc.locator('.article-toc-link'), 5);
  });

  test('toggle button is hidden on the desktop rail', async ({ page }) => {
    await visit(page, ARTICLE);
    await expectHidden(page, page.locator(TOGGLE));
  });

  test('clicking a TOC link navigates to the in-page anchor', async ({ page }) => {
    await visit(page, ARTICLE);
    const firstLink = page.locator(`${TOC} .article-toc-link`).first();
    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/^#.+/);
    await click(page, firstLink);
    expect(new URL(page.url()).hash).toBe(href);
  });

  test('scroll-spy highlights the link for the current section', async ({ page }) => {
    await visit(page, ARTICLE);
    /*
     * At the very top no heading has been passed yet — nothing
     * highlighted.
     */
    const initial = await page.locator(`${TOC} .article-toc-link--active`).count();
    expect(initial).toBe(0);

    /*
     * Scroll until the highlight settles, then capture which slug
     * won. We don't assert a specific heading text — different
     * articles have different headings; what matters is that the
     * active link's href matches a heading whose y is now above the
     * trigger line.
     */
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.scrollTo(0, 1500);
          const start = performance.now();
          const tick = (): void => {
            const active = document.querySelector(
              '[data-testid="article-toc"] .article-toc-link--active',
            );
            if (active || performance.now() - start > 1500) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    const active = page.locator(`${TOC} .article-toc-link--active`);
    await expect(active).toHaveCount(1);
    const href = await active.getAttribute('href');
    expect(href).toMatch(/^#.+/);
    await expect(active).toHaveAttribute('aria-current', 'location');

    /*
     * Verify the highlighted heading is actually one the reader has
     * passed (its y is above the trigger line near the top of
     * viewport).
     */
    const passed = await page.evaluate((h) => {
      const id = (h ?? '').slice(1);
      const heading = document.getElementById(id);
      if (!heading) return false;
      const headerH =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '60',
        ) || 60;
      return heading.getBoundingClientRect().top <= headerH * 1.5;
    }, href);
    expect(passed).toBe(true);
  });
});

test.describe('Article TOC — mobile slide-in', () => {
  test.use({ viewport: { width: 420, height: 800 } });

  test('FAB is visible, panel hidden until tap', async ({ page }) => {
    await visit(page, ARTICLE);
    await expectVisible(page, page.locator(TOGGLE));
    await expectAttribute(page, page.locator(TOGGLE), 'aria-expanded', 'false');
  });

  test('tapping FAB opens the panel', async ({ page }) => {
    await visit(page, ARTICLE);
    await openMobilePanel(page);
    await expectVisible(page, page.locator('#article-toc-nav'));
  });

  test('backdrop click dismisses the panel', async ({ page }) => {
    await visit(page, ARTICLE);
    await openMobilePanel(page);
    /*
     * Backdrop covers the whole viewport but the nav (z-index 1000)
     * sits on top of its left ~320px. A real user can only tap the
     * backdrop where the nav doesn't cover it — the gutter on the
     * right. Click via page.mouse at an explicit x outside the nav so
     * the event genuinely lands on the backdrop, not the nav.
     */
    await expectVisible(page, page.locator(BACKDROP));
    await page.mouse.click(390, 400);
    await expectAttribute(page, page.locator(TOGGLE), 'aria-expanded', 'false');
  });

  test('Escape dismisses the panel', async ({ page }) => {
    await visit(page, ARTICLE);
    await openMobilePanel(page);
    await pressKey(page, 'Escape');
    await expectAttribute(page, page.locator(TOGGLE), 'aria-expanded', 'false');
  });

  test('tapping a link dismisses the panel and updates hash', async ({ page }) => {
    await visit(page, ARTICLE);
    await openMobilePanel(page);
    const firstLink = page.locator(`${TOC} .article-toc-link`).first();
    const href = await firstLink.getAttribute('href');
    await click(page, firstLink);
    await expectAttribute(page, page.locator(TOGGLE), 'aria-expanded', 'false');
    expect(new URL(page.url()).hash).toBe(href);
  });
});
