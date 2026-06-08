import { expect, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/*
 * Footer regression suite.
 *
 * Validates copyright and the two link widgets shipped in #15:
 * - RSS feed link points to the per-locale feed at /<lang>/rss.xml
 *   and resolves to a non-empty XML document.
 * - GitHub link points to the org page on github.com.
 */

test.describe('Footer widgets', () => {
  test('RSS link resolves to a feed for the locale', async ({ page }) => {
    await visit(page, '/en');
    const rss = page.getByTestId('footer-rss');
    await expectVisible(page, rss);
    await expect(rss).toHaveAttribute('href', '/en/rss.xml');
    const response = await page.request.get('/en/rss.xml');
    expect(response.ok()).toBe(true);
    const body = await response.text();
    expect(body).toContain('<rss');
    expect(body).toContain('<language>en</language>');
  });

  test('GitHub link points to the org page', async ({ page }) => {
    await visit(page, '/en');
    const gh = page.getByTestId('footer-github');
    await expectVisible(page, gh);
    await expect(gh).toHaveAttribute('href', 'https://github.com/communist-prometheus');
    await expect(gh).toHaveAttribute('rel', /noopener/);
  });

  test('public email is exposed as a mailto: link', async ({ page }) => {
    await visit(page, '/en');
    const email = page.getByTestId('footer-email');
    await expectVisible(page, email);
    await expect(email).toHaveAttribute('href', 'mailto:public@comprom.org');
    await expect(email).toContainText('public@comprom.org');
  });

  /*
   * The Revolutionary Internationalists webring (tickets#22) is
   * gated by the `webring` feature flag in `settings/features.json`.
   * When the flag is off (today's prod state), the footer must NOT
   * carry the `revint-webring` element nor its CDN loader script.
   * When the flag flips on, a sibling test in the webring repo's
   * own Playwright suite asserts the embedded behaviour.
   */
  test('webring element + CDN loader stay out when the flag is off', async ({ page }) => {
    await visit(page, '/en');
    await expect(page.getByTestId('footer-webring')).toHaveCount(0);
    await expect(page.locator('script[src="https://cdn.comprom.org/webring.js"]')).toHaveCount(0);
  });

  test('copyright still renders in Russian locale', async ({ page }) => {
    await visit(page, '/ru');
    await expectVisible(page, page.locator('footer').getByText('Communist Prometheus'));
  });
});
