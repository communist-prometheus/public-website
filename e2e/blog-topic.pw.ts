import { expect, expectMinCount, test, visit } from '@prometheus/e2e-toolkit';

/**
 * Editorial topic markers E2E.
 *
 * A topic (settings/topics.json) colours the article header banner and
 * the listing card. These guards lean on the `editorial` topic seeded on
 * the cyber-tool article: the banner must render name + subtitle above
 * the title, and the card must carry the subtitle tag plus a border in
 * the topic colour that differs from a topic-less card.
 */

const ARTICLE = '/ru/blog/cyber-tool';
const BLOG = '/ru/blog';

test('article header renders the topic banner with name and subtitle', async ({ page }) => {
  await visit(page, ARTICLE);

  const banner = page.locator('.topic-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('data-topic', 'editorial');
  await expect(banner.locator('.topic-name')).not.toBeEmpty();
  await expect(banner.locator('.topic-subtitle')).not.toBeEmpty();

  // The accent border proves the topic colour reached the banner.
  const borderColor = await banner.evaluate((el) => getComputedStyle(el).borderBottomColor);
  expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
});

test('listing card shows the topic tag and a topic-coloured border', async ({ page }) => {
  await visit(page, BLOG);

  const topicCells = page.locator('[data-topic="editorial"]');
  await expectMinCount(page, topicCells, 1);

  const card = topicCells.first().locator('.post-card');
  const tag = card.locator('.topic-tag');
  await expect(tag).toBeVisible();
  await expect(tag).not.toBeEmpty();

  /*
   * A topic-less card keeps the neutral border; the topic card must not.
   * Comparing the two resolved colours proves the marker without pinning
   * the test to a specific hex the editor could later change.
   */
  const neutralCard = page.locator('[data-category]:not([data-topic]) .post-card').first();
  const [topicBorder, neutralBorder] = await Promise.all([
    card.evaluate((el) => getComputedStyle(el).borderTopColor),
    neutralCard.evaluate((el) => getComputedStyle(el).borderTopColor),
  ]);
  expect(topicBorder).not.toBe(neutralBorder);
});
