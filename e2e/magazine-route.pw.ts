import { expect, expectVisible, test, visit } from '@prometheus/e2e-toolkit';
import { buildSectionAvailability, hasSection } from './helpers/content-coverage';

/**
 * The section moved from /<lang>/newspaper to /<lang>/magazine. The
 * 301s that keep the old URLs alive are a Cloudflare `_redirects`
 * feature, so they cannot be exercised against `astro preview` — they
 * are asserted against the deployed site in
 * `verify-magazine-asset-headers.pw.ts`, and the rule file's shape is
 * unit-tested in `src/features/magazine/helpers/redirectRules.test.ts`.
 *
 * What this spec locks is the part the static build owns: the new route
 * exists for every locale, and an issue page carries the download links
 * and the back-link to the listing.
 */
const LISTING_HEADING = 'h1';
const ISSUE_COVER = '[data-testid="issue-cover"]';
const ISSUE_CARD = '[data-testid="magazine-card"]';
const PDF_LINK = '[data-testid="magazine-pdf"]';
const BACK_LINK = '.back-link';

const availability = buildSectionAvailability();

test.describe('Magazine section', () => {
  test('the listing answers for a locale with no issues instead of 404ing', async ({ page }) => {
    const res = await visit(page, '/pl/magazine');
    expect(res?.status(), 'status for /pl/magazine').toBeLessThan(400);
    await expectVisible(page, page.locator(LISTING_HEADING).first());
  });

  test('a published issue is reachable from the listing and offers its PDF', async ({ page }) => {
    test.skip(!hasSection(availability, 'ru', 'magazine'), 'no Russian issue in this snapshot');

    await visit(page, '/ru/magazine');
    const card = page.locator(ISSUE_CARD).first();
    await expectVisible(page, card);

    const href = await card.locator('a.cover-link').getAttribute('href');
    expect(href, 'card links into the magazine route').toMatch(/^\/ru\/magazine\//);

    await visit(page, href ?? '/ru/magazine');
    await expectVisible(page, page.locator(PDF_LINK).first());

    const back = await page.locator(BACK_LINK).getAttribute('href');
    expect(back).toBe('/ru/magazine');

    /*
     * The cover is how a reader recognises an issue — it belongs on the
     * issue's own page, not only on the card that links to it.
     */
    await expectVisible(page, page.locator(ISSUE_COVER).first());

    /*
     * "Back" says nothing about where it goes. The label's own field is
     * called `backToList`; the copy now says so.
     */
    const label = await page.locator(BACK_LINK).textContent();
    expect(label?.toLowerCase()).toContain('к списку');
  });

  test('the per-locale RSS feed is served at magazine.xml', async ({ request }) => {
    const res = await request.get('/ru/magazine.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('<language>ru</language>');
    expect(body).toContain('/ru/magazine/');
  });
});
