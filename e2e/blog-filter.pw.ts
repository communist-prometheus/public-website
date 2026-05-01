import {
  click,
  expect,
  expectClass,
  expectHidden,
  expectMinCount,
  expectVisible,
  test,
  visit,
} from '@prometheus/e2e-toolkit';

/**
 * Blog category filter E2E tests.
 *
 * Covers:
 * 1. All posts visible by default
 * 2. Clicking a category shows only matching posts
 * 3. Clicking "All" restores all posts
 * 4. Active button styling follows selection
 * 5. Filter works after SPA navigation to blog page
 */

// Blog has content in ru / it; en is intentionally empty in prod.
const BLOG = '/ru/blog';

test.describe('Blog category filter', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, BLOG);
  });

  test('all posts are visible by default', async ({ page }) => {
    const posts = page.locator('.grid [data-category]');
    await expectMinCount(page, posts, 2);
  });

  test('"All" button is active by default', async ({ page }) => {
    const allBtn = page.locator('.category-btn[data-category="all"]');
    await expectClass(page, allBtn, /active/);
  });

  test('clicking a category filters posts correctly', async ({ page }) => {
    const categoryBtns = page.locator('.category-btn:not([data-category="all"])');
    await expectMinCount(page, categoryBtns, 1);

    const firstCategoryBtn = categoryBtns.first();
    const category = await firstCategoryBtn.getAttribute('data-category');
    await click(page, firstCategoryBtn);
    await expectClass(page, firstCategoryBtn, /active/);

    const matching = page.locator(`.grid [data-category="${category}"]:not(.hidden)`);
    await expectMinCount(page, matching, 1);
    const others = page.locator(`.grid [data-category]:not([data-category="${category}"])`);
    if ((await others.count()) > 0) {
      await expectHidden(page, others.first());
    }
  });

  test('clicking "All" restores all posts', async ({ page }) => {
    const categoryBtns = page.locator('.category-btn:not([data-category="all"])');
    await click(page, categoryBtns.first());
    const allBtn = page.locator('.category-btn[data-category="all"]');
    await click(page, allBtn);
    await expectClass(page, allBtn, /active/);

    const posts = page.locator('.grid [data-category]');
    const count = await posts.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expectVisible(page, posts.first());
  });

  test('filter works after SPA navigation to blog', async ({ page }) => {
    await visit(page, '/ru');
    const blogLink = page.locator('a[href="/ru/blog"]').first();
    await click(page, blogLink);
    const categoryBtns = page.locator('.category-btn:not([data-category="all"])');
    await expectMinCount(page, categoryBtns, 1);
    const firstCategoryBtn = categoryBtns.first();
    const category = await firstCategoryBtn.getAttribute('data-category');
    await click(page, firstCategoryBtn);
    const matching = page.locator(`.grid [data-category="${category}"]:not(.hidden)`);
    await expectMinCount(page, matching, 1);
  });
});
