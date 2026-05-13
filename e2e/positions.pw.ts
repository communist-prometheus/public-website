import { expectText, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/*
 * Positions are an editorial-only feature: editors can publish or
 * fully clear them via the admin. The current production state has
 * NO positions, so detail-page assertions and `>=2 cards` minimums
 * would break the suite the moment the editor empties the list. The
 * tests we keep here only hit the listing route directly — its
 * page-level `<h1>` is part of the static layout and renders even
 * when the collection is empty. We deliberately do NOT assert the
 * top-nav Positions link, because `getSectionAvailability()`
 * (`src/config/section-availability.ts`) hides that link when the
 * collection has zero published items per language — which is the
 * current prod state.
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

  /*
   * positions-widget on /en used to be asserted here, but the widget
   * only renders when the editor has at least one published
   * position. With the corpus possibly empty the assertion would
   * flake — the widget's existence is editor-controlled, not chrome.
   */
});
