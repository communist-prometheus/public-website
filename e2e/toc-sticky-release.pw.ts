import { expect, type Page, test, visit } from '@prometheus/e2e-toolkit';

/*
 * TOC sticky-release behaviour (issue #85).
 *
 * Desktop (≥1280px): the sidebar uses `position: sticky` inside an
 * absolutely-positioned rail bounded by the `<article>` element. As
 * the reader scrolls into the article body the sidebar pins to
 * `top: var(--header-height) + 8px`. When the article wrapper's
 * bottom approaches the viewport, the sticky range ends and the
 * sidebar scrolls up "под шапку" with the rail — so the site footer
 * stays unobstructed.
 *
 * Mobile (<1280px): the FAB lives in BaseLayout's `floating` slot,
 * sibling of <main>, so its `position: fixed` pins to the viewport
 * regardless of how far the article has scrolled.
 *
 * `manifest` is the longest evergreen article and a stable target —
 * if its slug changes the test should be repointed at any other
 * long EN article with ≥4 sub-headings.
 */

const ARTICLE = '/en/manifest';
const SIDEBAR = '[data-testid="article-toc-sidebar"]';
const FAB = '[data-testid="article-toc-toggle"]';

const readSidebar = (page: Page) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    return {
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      visible: r.bottom > 0 && r.top < window.innerHeight,
    };
  }, SIDEBAR);

const readFab = (page: Page) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    return {
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      vh: window.innerHeight,
    };
  }, FAB);

const headerHeight = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    return parseFloat(raw || '60') || 60;
  });

const scrollTo = async (page: Page, y: number): Promise<void> => {
  await page.evaluate(
    (target) =>
      new Promise<void>((resolve) => {
        window.scrollTo({ top: target, behavior: 'instant' });
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
    y,
  );
};

test.describe('Article TOC — desktop sticky release', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test('sidebar pins below the header while the article scrolls', async ({ page }) => {
    await visit(page, ARTICLE);
    const sidebar = page.locator(SIDEBAR);
    await expect(sidebar).toBeVisible();

    /*
     * Scroll well into the article body. The sticky rail should
     * follow until its top hits `header-height + 8px`, then pin
     * there for the rest of the article range.
     */
    await scrollTo(page, 800);
    const headerH = await headerHeight(page);
    const pinned = await readSidebar(page);
    expect(pinned).toBeDefined();
    if (!pinned) throw new Error('sidebar missing after scroll');
    /*
     * Sticky offset is `header-height + 0.5rem` (~8px). Allow a few
     * pixels of slack for sub-pixel rounding across browsers.
     */
    expect(pinned.top).toBeGreaterThanOrEqual(headerH);
    expect(pinned.top).toBeLessThanOrEqual(headerH + 16);
  });

  test('sidebar releases when the article footer enters the viewport', async ({ page }) => {
    await visit(page, ARTICLE);
    /*
     * Scroll to the document end so the article wrapper's bottom is
     * above the viewport — the sticky rail must have scrolled up out
     * of view, otherwise it would overlap the site footer.
     */
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'instant',
          });
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    const released = await readSidebar(page);
    expect(released).toBeDefined();
    if (!released) throw new Error('sidebar missing after release');
    const vh = await page.evaluate(() => window.innerHeight);
    /*
     * Released = the sidebar's top has scrolled above the viewport
     * top OR its bottom is above the viewport (i.e. it is not
     * occupying viewport real estate that would overlap the site
     * footer).
     */
    expect(released.bottom).toBeLessThanOrEqual(vh);
  });
});

test.describe('Article TOC — mobile FAB stays fixed', () => {
  test.use({ viewport: { width: 420, height: 800 } });

  test('FAB is anchored to viewport bottom-left across scroll', async ({ page }) => {
    await visit(page, ARTICLE);
    const top0 = await readFab(page);
    expect(top0).toBeDefined();
    if (!top0) throw new Error('FAB missing on mobile');
    /*
     * FAB sits at bottom: var(--spacing-md). Its bottom should be
     * within ~32px of viewport bottom, and left within ~32px of
     * viewport left edge.
     */
    expect(top0.vh - top0.bottom).toBeLessThan(40);
    expect(top0.left).toBeLessThan(40);

    await scrollTo(page, 1200);
    const scrolled = await readFab(page);
    expect(scrolled).toBeDefined();
    if (!scrolled) throw new Error('FAB missing after scroll');
    /*
     * Post-scroll: viewport-anchored coordinates must be unchanged
     * (within sub-pixel slack). If the FAB drifted, it was clipped
     * to <main>'s containing block instead of the viewport.
     */
    expect(Math.abs(scrolled.bottom - top0.bottom)).toBeLessThan(2);
    expect(Math.abs(scrolled.left - top0.left)).toBeLessThan(2);
  });
});
