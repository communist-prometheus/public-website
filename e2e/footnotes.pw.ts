import { expect, test } from '@prometheus/e2e-toolkit';

/*
 * Footnote-popover enhancer end-to-end.
 *
 * Runs against a private test fixture at /test-footnotes that
 * renders three GFM `[^N]` footnotes. The page is excluded from the
 * sitemap and carries a noindex meta — it exists only so e2e can
 * exercise the real Astro markdown pipeline against the production
 * bundle.
 */

const TEST_URL = '/test-footnotes';

test.describe('Footnote popover enhancer', () => {
  test('each ref becomes an accessible popover trigger', async ({ page }) => {
    await page.goto(TEST_URL);
    const trigger = page.locator('button[data-footnote-ref]').first();
    await expect(trigger).toHaveAttribute('popovertarget', /user-content-fn-popover/);
    await expect(trigger).toHaveAttribute('aria-describedby', /user-content-fn-popover/);
  });

  test('clicking a ref opens its popover with the footnote body', async ({ page }) => {
    await page.goto(TEST_URL);
    const trigger = page.locator('button[data-footnote-ref]').first();
    await trigger.click();
    const popover = page.locator('#user-content-fn-popover-1');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText('Karl Marx');
    await expect(popover).toHaveAttribute('role', 'dialog');
  });

  test('the jump link navigates to the footnote and back returns to the marker', async ({
    page,
  }) => {
    await page.goto(TEST_URL);
    await page.locator('button[data-footnote-ref]').first().click();
    const jump = page.locator('#user-content-fn-popover-1 a.footnote-jump');
    await expect(jump).toBeVisible();
    await jump.click();
    await expect(page).toHaveURL(/#user-content-fn-1$/);
    /*
     * Browser back must land us back on the marker — the popover
     * pushed the marker hash onto history before navigating.
     */
    await page.goBack();
    await expect(page).toHaveURL(/#user-content-fnref-1$/);
  });

  test('the section backref also returns to the marker', async ({ page }) => {
    await page.goto(`${TEST_URL}#user-content-fn-1`);
    const backref = page.locator('li#user-content-fn-1 a[data-footnote-backref]');
    await expect(backref).toBeVisible();
    await backref.click();
    await expect(page).toHaveURL(/#user-content-fnref-1$/);
  });
});
