import { expect, expectMinCount, test, visit } from '@prometheus/e2e-toolkit';

/**
 * Blog card click target E2E.
 *
 * The whole card is a single link (a stretched `::before` overlay on
 * the title anchor). Regression guard: clicking the SUMMARY text must
 * navigate — it previously sat above the overlay (`z-index: 1`) so
 * clicks on the description were swallowed and did nothing.
 */

const BLOG = '/ru/blog';

test('clicking a card summary navigates to the article', async ({ page }) => {
  await visit(page, BLOG);

  const cards = page.locator('.post-card');
  await expectMinCount(page, cards, 1);

  const firstSummary = cards.first().locator('.post-summary');
  await expect(firstSummary).toBeVisible();

  await firstSummary.click();
  await page.waitForURL(/\/ru\/blog\/.+/);
  expect(new URL(page.url()).pathname).not.toBe(BLOG);
});

test('clicking the category badge navigates to the article', async ({ page }) => {
  await visit(page, BLOG);

  const cards = page.locator('.post-card');
  await expectMinCount(page, cards, 1);

  // The category badge is on every card (unlike the cover image) and is
  // non-link content under the overlay — same dead-zone the fix closes.
  await cards.first().locator('.category').click();
  await page.waitForURL(/\/ru\/blog\/.+/);
});
