import { expect, test, visit } from '@prometheus/e2e-toolkit';

/**
 * Editorial topics are an opt-in marker: editors tag articles in the
 * admin, so at any given time zero or more articles carry a topic. This
 * suite adapts to the live content — it asserts the markers render
 * correctly when a tagged article exists, and that the feature stays
 * inert (no stray markers) when none does. Either way it makes real
 * assertions, so it never silently passes.
 */

const BLOG = '/ru/blog';

/** Listing cells that carry a topic (cells also expose data-category). */
const TAGGED_CELL = '[data-category][data-topic]';

test('listing marks tagged cards and leaves untagged ones neutral', async ({ page }) => {
  await visit(page, BLOG);

  const tagged = page.locator(TAGGED_CELL);
  const count = await tagged.count();

  if (count === 0) {
    // Nothing tagged yet: no stray topic tags may appear anywhere.
    await expect(page.locator('.topic-tag')).toHaveCount(0);
    return;
  }

  const card = tagged.first().locator('.post-card');
  const tag = card.locator('.topic-tag');
  await expect(tag).toBeVisible();
  await expect(tag).not.toBeEmpty();

  // The tagged card's border must differ from a neutral (untagged) card.
  const neutralCard = page.locator('[data-category]:not([data-topic]) .post-card').first();
  const [topicBorder, neutralBorder] = await Promise.all([
    card.evaluate((el) => getComputedStyle(el).borderTopColor),
    neutralCard.evaluate((el) => getComputedStyle(el).borderTopColor),
  ]);
  expect(topicBorder).not.toBe(neutralBorder);
});

test('article banner renders for a tagged article, and is absent otherwise', async ({ page }) => {
  await visit(page, BLOG);

  const tagged = page.locator(TAGGED_CELL);
  const hasTagged = (await tagged.count()) > 0;

  /*
   * `.post-card a` targets a real article link (not a CategoryFilter
   * button, which also carries data-category).
   */
  const cardLink = hasTagged
    ? tagged.first().locator('.post-card a').first()
    : page.locator('.post-card a').first();
  const href = await cardLink.getAttribute('href');
  if (!href) throw new Error('no article link found on the blog listing');
  await visit(page, href);

  const banner = page.locator('.topic-banner');
  if (hasTagged) {
    await expect(banner).toBeVisible();
    await expect(banner.locator('.topic-name')).not.toBeEmpty();
    await expect(banner.locator('.topic-subtitle')).not.toBeEmpty();
  } else {
    // An untagged article must not render a topic banner.
    await expect(banner).toHaveCount(0);
  }
});
