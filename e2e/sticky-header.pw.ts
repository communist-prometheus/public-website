import { expect, type Page, test, visit } from '@prometheus/e2e-toolkit';

/*
 * Sticky-with-reveal header — mirrors the admin AppHeader pattern.
 *
 * Asserts:
 * - Header is sticky at top:0 (engaged once user scrolls past the
 *   header line). Pre-existing bug was that body { overflow-x: hidden }
 *   computed `overflow-y: auto`, making body the sticky scope while
 *   actual scroll happened on html — so sticky never engaged. Theme
 *   stylesheet now uses `overflow-x: clip` to keep scroll on html.
 * - Scrolling down past the header retracts it (translateY -height).
 * - Scrolling back up reveals it (translateY 0).
 * - `--header-height` and `--header-offset` CSS variables are
 *   published so other components can lay out around the header.
 * - On mobile, the MobileMenu FAB is rendered as a body sibling and
 *   is unaffected by the header's transform.
 */

const ARTICLE = '/en/blog/astro-framework';

const readState = (page: Page) =>
  page.evaluate(() => ({
    y: window.scrollY,
    transform: document.querySelector('header')?.style.transform ?? '',
    bboxTop: document.querySelector('header')?.getBoundingClientRect().top ?? 0,
    height: getComputedStyle(document.documentElement).getPropertyValue('--header-height'),
    offset: getComputedStyle(document.documentElement).getPropertyValue('--header-offset'),
  }));

const scrollAndSettle = async (page: Page, y: number): Promise<void> => {
  /*
   * Scroll, then poll until the rAF-throttled scroll handler in
   * Header.astro publishes a `--header-offset` value matching the
   * new scroll direction. Polling beats waiting on a fixed number
   * of rAF callbacks because the handler can land in either of the
   * next two frames depending on browser scheduling.
   */
  await page.evaluate(
    (target) =>
      new Promise<void>((resolve) => {
        const before = window.scrollY;
        window.scrollTo(0, target);
        const goingDown = target > before;
        const goingUp = target < before;
        const start = performance.now();
        const tick = () => {
          const offset = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--header-offset') || '0',
          );
          const settled =
            (goingDown && offset < 0) || (goingUp && offset === 0) || (!goingDown && !goingUp);
          if (settled || performance.now() - start > 1000) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    y,
  );
};

test.describe('Sticky header — desktop', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test('engages position:sticky so header stays near the viewport top', async ({ page }) => {
    await visit(page, ARTICLE);
    await scrollAndSettle(page, 500);
    const s = await readState(page);
    /*
     * 500px scroll. If `position: sticky` is engaging, the header's
     * viewport-relative top is between -height (fully retracted by
     * the scroll-reveal transform) and 0 (still pinned). Without
     * sticky we'd see ≈ -500.
     */
    expect(s.y).toBe(500);
    expect(s.bboxTop).toBeGreaterThan(-200);
  });

  test('publishes --header-height and --header-offset', async ({ page }) => {
    await visit(page, ARTICLE);
    const initial = await readState(page);
    expect(initial.height).toMatch(/\d+px/);
    expect(parseFloat(initial.height)).toBeGreaterThan(40);
    await scrollAndSettle(page, 500);
    const scrolled = await readState(page);
    expect(parseFloat(scrolled.offset)).toBeLessThan(0);
  });

  test('reveals on scroll-up', async ({ page }) => {
    await visit(page, ARTICLE);
    await scrollAndSettle(page, 800);
    const hidden = await readState(page);
    expect(hidden.transform).toMatch(/translateY\(-\d/);
    await scrollAndSettle(page, 600);
    const revealed = await readState(page);
    expect(revealed.transform).toBe('translateY(0px)');
  });
});

test.describe('Sticky header — mobile (MobileMenu lives outside header)', () => {
  test.use({ viewport: { width: 420, height: 800 } });

  test('FAB is a body sibling, not nested in <header>', async ({ page }) => {
    await visit(page, ARTICLE);
    const parentTag = await page.evaluate(() => {
      const w = document.querySelector('[data-testid="mobile-menu-wrapper"]');
      return w?.parentElement?.tagName ?? null;
    });
    expect(parentTag).toBe('BODY');
  });

  test('FAB stays anchored to viewport when header retracts', async ({ page }) => {
    await visit(page, ARTICLE);
    await scrollAndSettle(page, 1000);
    const result = await page.evaluate(() => {
      const fab = document.querySelector(
        '[data-testid="mobile-menu-toggle"]',
      ) as HTMLElement | null;
      const header = document.querySelector('header') as HTMLElement | null;
      return {
        fabBottom: fab?.getBoundingClientRect().bottom ?? 0,
        headerTransform: header?.style.transform ?? '',
      };
    });
    /* Header retracted, FAB still anchored near viewport bottom (≤ 800). */
    expect(result.headerTransform).toMatch(/translateY\(-\d/);
    expect(result.fabBottom).toBeLessThanOrEqual(800);
    expect(result.fabBottom).toBeGreaterThan(700);
  });
});
