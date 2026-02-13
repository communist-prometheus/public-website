import { expect, test } from '@playwright/test';

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

const BLOG = '/en/blog';

test.describe('Blog category filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BLOG);
    await page.waitForLoadState('networkidle');
  });

  test('all posts are visible by default', async ({ page }) => {
    const posts = page.locator('.grid [data-category]');
    const count = await posts.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      await expect(posts.nth(i)).toBeVisible();
    }
  });

  test('"All" button is active by default', async ({ page }) => {
    const allBtn = page.locator('.category-btn[data-category="all"]');
    await expect(allBtn).toHaveClass(/active/);
  });

  test('clicking a category filters posts correctly', async ({ page }) => {
    const categoryBtns = page.locator('.category-btn:not([data-category="all"])');
    const btnCount = await categoryBtns.count();
    expect(btnCount).toBeGreaterThanOrEqual(1);

    const firstCategoryBtn = categoryBtns.first();
    const category = await firstCategoryBtn.getAttribute('data-category');
    await firstCategoryBtn.click();

    await expect(firstCategoryBtn).toHaveClass(/active/);

    const allPosts = page.locator('.grid [data-category]');
    const totalCount = await allPosts.count();

    for (let i = 0; i < totalCount; i++) {
      const post = allPosts.nth(i);
      const postCategory = await post.getAttribute('data-category');
      if (postCategory === category) {
        await expect(post).toBeVisible();
      } else {
        await expect(post).not.toBeVisible();
      }
    }
  });

  test('clicking "All" restores all posts', async ({ page }) => {
    const categoryBtns = page.locator('.category-btn:not([data-category="all"])');
    await categoryBtns.first().click();

    const allBtn = page.locator('.category-btn[data-category="all"]');
    await allBtn.click();

    await expect(allBtn).toHaveClass(/active/);

    const posts = page.locator('.grid [data-category]');
    const count = await posts.count();
    for (let i = 0; i < count; i++) {
      await expect(posts.nth(i)).toBeVisible();
    }
  });

  test('filter works after SPA navigation to blog', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const blogLink = page.locator('a[href="/en/blog"]').first();
    await blogLink.click();
    await page.waitForURL('**/blog');

    const categoryBtns = page.locator('.category-btn:not([data-category="all"])');
    const btnCount = await categoryBtns.count();
    expect(btnCount).toBeGreaterThanOrEqual(1);

    const firstCategoryBtn = categoryBtns.first();
    const category = await firstCategoryBtn.getAttribute('data-category');
    await firstCategoryBtn.click();

    const allPosts = page.locator('.grid [data-category]');
    const totalCount = await allPosts.count();
    let visibleCount = 0;

    for (let i = 0; i < totalCount; i++) {
      const post = allPosts.nth(i);
      const postCategory = await post.getAttribute('data-category');
      if (postCategory === category) {
        await expect(post).toBeVisible();
        visibleCount++;
      } else {
        await expect(post).not.toBeVisible();
      }
    }

    expect(visibleCount).toBeGreaterThanOrEqual(1);
  });
});
