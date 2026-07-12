import { expect, expectVisible, test, visit } from '@prometheus/e2e-toolkit';
import { buildSectionAvailability, hasSection } from './helpers/content-coverage';

/*
 * The home page advertises the latest magazine issue and the manifest.
 *
 * Both blocks are conditional, and that is the part worth pinning: a
 * language with no published issue must not be shown a cover, and a
 * language with no manifest must not be offered a link into a 404. The
 * old "every lang has every section" assumption is exactly how `/en/…`
 * once shipped links to pages that did not exist.
 */

const MAGAZINE = '[data-testid="magazine-widget"]';
const MAGAZINE_LINK = '[data-testid="magazine-widget-link"]';
const MANIFEST = '[data-testid="manifest-widget"]';
const MANIFEST_LINK = '[data-testid="manifest-widget-link"]';

const availability = buildSectionAvailability();

test.describe('Home — latest magazine issue', () => {
  test('links to the newest issue and shows its cover', async ({ page }) => {
    test.skip(!hasSection(availability, 'ru', 'magazine'), 'no Russian issue in this snapshot');

    await visit(page, '/ru');
    await expectVisible(page, page.locator(MAGAZINE));

    const href = await page.locator(MAGAZINE_LINK).getAttribute('href');
    expect(href).toMatch(/^\/ru\/magazine\/.+/);

    /* The cover is the point of the block. */
    await expectVisible(page, page.locator(`${MAGAZINE} img`).first());

    /* Following it must land on a real issue page, not a 404. */
    const res = await visit(page, href ?? '/ru/magazine');
    expect(res?.status()).toBeLessThan(400);
  });

  test('is absent for a language with no published issue', async ({ page }) => {
    test.skip(hasSection(availability, 'pl', 'magazine'), 'Polish now has an issue');

    await visit(page, '/pl');
    await expect(page.locator(MAGAZINE)).toHaveCount(0);
  });
});

test.describe('Home — manifest', () => {
  test('offers the manifest in its own section', async ({ page }) => {
    test.skip(!hasSection(availability, 'ru', 'manifest'), 'no Russian manifest in this snapshot');

    await visit(page, '/ru');
    await expectVisible(page, page.locator(MANIFEST));
    expect(await page.locator(MANIFEST_LINK).getAttribute('href')).toBe('/ru/manifest');

    const res = await visit(page, '/ru/manifest');
    expect(res?.status()).toBeLessThan(400);
  });

  /*
   * `/{lang}/manifest` is only built for languages that have the page, so
   * a link where it does not exist is a link into a 404.
   */
  test('is absent for a language with no manifest', async ({ page }) => {
    test.skip(hasSection(availability, 'pl', 'manifest'), 'Polish now has a manifest');

    await visit(page, '/pl');
    await expect(page.locator(MANIFEST)).toHaveCount(0);
  });
});
