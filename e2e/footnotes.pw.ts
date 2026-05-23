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

/*
 * Legacy-format coverage. Articles imported by the older admin
 * pipeline have a trailing `<ol>` with `↑`-style back-links but
 * no inline body markers and no `id` on the list items. The
 * annotation pass should give each `<li>` an `id="endnote-N"`
 * so direct deep-links work.
 */
const LEGACY_URL = '/test-footnotes-legacy';

test.describe('Footnote popover enhancer — legacy bottom list', () => {
  test('each footnote <li> picks up an `id="endnote-N"`', async ({ page }) => {
    await page.goto(LEGACY_URL);
    await expect(page.locator('li#endnote-1')).toBeVisible();
    await expect(page.locator('li#endnote-2')).toBeVisible();
    await expect(page.locator('li#endnote-3')).toBeVisible();
  });

  test('direct deep-link #endnote-2 scrolls to that footnote', async ({ page }) => {
    await page.goto(`${LEGACY_URL}#endnote-2`);
    const li = page.locator('li#endnote-2');
    await expect(li).toBeInViewport();
    await expect(li).toContainText('Friedrich Engels');
  });

  test('loads a footnote hash that did not exist at first paint', async ({ page }) => {
    /*
     * The browser tries to scroll to `#endnote-N` once, right after
     * the initial parse — before the annotation pass has added the
     * id. The enhancer must re-fire the scroll itself so the user
     * lands on the footnote, not at the top of the page.
     */
    await page.goto(`${LEGACY_URL}#endnote-3`);
    await expect(page.locator('li#endnote-3')).toBeInViewport();
  });
});

/*
 * Old external shares predating the GFM rename use `#endnote-N` /
 * `#endnote-ref-N`. On articles that have been re-imported to GFM
 * those ids no longer exist in the DOM (the GFM rename moved the
 * marker id to `user-content-fnref-N` and the body to
 * `user-content-fn-N`); the enhancer maps the legacy hash to the
 * new id so old links keep working.
 */
test.describe('Footnote popover enhancer — legacy hash on GFM article', () => {
  test('#endnote-ref-N scrolls to the GFM marker', async ({ page }) => {
    await page.goto(`${TEST_URL}#endnote-ref-1`);
    await expect(page.locator('#user-content-fnref-1')).toBeInViewport();
  });

  test('#endnote-N scrolls to the GFM footnote body', async ({ page }) => {
    await page.goto(`${TEST_URL}#endnote-1`);
    await expect(page.locator('#user-content-fn-1')).toBeInViewport();
  });
});
