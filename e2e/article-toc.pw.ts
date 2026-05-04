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
 * `astro-framework` is used because it has a known h1/h2/h3 hierarchy
 * in EN; if that file moves, point at any other published EN blog
 * post that ships ≥2 sub-headings.
 */

const ARTICLE = '/en/blog/astro-framework';

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
