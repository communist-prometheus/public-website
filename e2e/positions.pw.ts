import { expectText, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/*
 * Positions are an editorial-only feature: editors can publish or
 * fully clear them via the admin. The current production state has
 * NO positions, so detail-page assertions and `>=2 cards` minimums
 * would break the suite the moment the editor empties the list. The
 * tests we keep are content-agnostic — they assert that the chrome
 * (heading, nav link, widget) renders regardless of how many entries
 * the editor has published.
 */
test.describe('Positions section', () => {
  test('positions listing page renders with heading', async ({ page }) => {
    await visit(page, '/en/positions');
    await expectText(page, page.locator('h1'), 'Positions');
  });

  test('positions listing page renders in Russian', async ({ page }) => {
    await visit(page, '/ru/positions');
    await expectText(page, page.locator('h1'), 'Позиции');
  });

  test('navigation contains Positions link', async ({ page }) => {
    await visit(page, '/en');
    const nav = page.locator('[data-testid="desktop-nav"]');
    await expectVisible(page, nav.locator('a[href="/en/positions"]'));
  });

  /*
   * positions-widget on /en used to be asserted here, but the widget
   * only renders when the editor has at least one published
   * position. With the corpus possibly empty the assertion would
   * flake — the widget's existence is editor-controlled, not chrome.
   */
});
