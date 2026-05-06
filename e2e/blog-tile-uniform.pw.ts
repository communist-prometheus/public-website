import { expect, expectMinCount, type Page, test, visit } from '@prometheus/e2e-toolkit';

/**
 * Blog tile uniformity E2E.
 *
 * Verifies that the listing renders every blog card at the same height
 * (within 1px tolerance) and that each card's inner text content is
 * fully contained inside the card box (no overflow). The fix is pure
 * CSS — `grid-auto-rows: 1fr` on the grid plus line-clamp on the title
 * and summary inside `.post-card`.
 */

const BLOG = '/ru/blog';
const TOLERANCE_PX = 1;
const CARD = '.post-card';

interface CardMetrics {
  readonly height: number;
  readonly bottom: number;
}

interface ChildExtents {
  readonly maxBottom: number;
  readonly maxRight: number;
}

const cardMetrics = async (page: Page): Promise<readonly CardMetrics[]> =>
  page.locator(CARD).evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      return { height: rect.height, bottom: rect.bottom };
    }),
  );

const childExtents = async (page: Page): Promise<readonly (ChildExtents & CardMetrics)[]> =>
  page.locator(CARD).evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      const descendants = Array.from(el.querySelectorAll('*'));
      const maxBottom = descendants.reduce((acc, child) => {
        const r = child.getBoundingClientRect();
        return r.bottom > acc ? r.bottom : acc;
      }, rect.top);
      const maxRight = descendants.reduce((acc, child) => {
        const r = child.getBoundingClientRect();
        return r.right > acc ? r.right : acc;
      }, rect.left);
      return {
        height: rect.height,
        bottom: rect.bottom,
        maxBottom,
        maxRight,
      };
    }),
  );

test.describe('Blog tile uniformity', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, BLOG);
  });

  test('every card has the same height within 1px', async ({ page }) => {
    const cards = page.locator(CARD);
    await expectMinCount(page, cards, 2);

    const metrics = await cardMetrics(page);
    const first = metrics[0];
    if (!first) throw new Error('no cards measured');
    for (const m of metrics) {
      expect(Math.abs(m.height - first.height)).toBeLessThanOrEqual(TOLERANCE_PX);
    }
  });

  test('inner content does not overflow the card box', async ({ page }) => {
    const cards = page.locator(CARD);
    await expectMinCount(page, cards, 2);

    const measurements = await childExtents(page);
    for (const m of measurements) {
      expect(m.maxBottom).toBeLessThanOrEqual(m.bottom + TOLERANCE_PX);
    }
  });

  test('listing screenshot at 1280px viewport', async ({ page }) => {
    const cards = page.locator(CARD);
    await expectMinCount(page, cards, 2);
    await page.locator('.grid').first().screenshot({ path: 'screenshots/blog-tiles-1280.png' });
  });
});
