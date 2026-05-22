import { expect, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/*
 * `/[lang]/links` — the "Resources & allies" directory built from
 * src/data/links.ts. Asserts the page renders, the three groups
 * are present, a known organisation + a known archive resolve, and
 * external links open safely. The footer link is covered in
 * footer.pw.ts.
 */
test.describe('Links page', () => {
  test('renders grouped resources & allies (en)', async ({ page }) => {
    await visit(page, '/en/links');
    await expectVisible(page, page.locator('h1'));
    await expect(page.locator('h1')).toHaveText(/Resources & allies/i);
    // Three group headings.
    await expect(page.locator('.link-group h2')).toHaveCount(3);
    // A known organisation + a known archive are listed as external links.
    const ict = page.locator('a.link-name', {
      hasText: 'Internationalist Communist Tendency',
    });
    await expectVisible(page, ict);
    await expect(ict).toHaveAttribute('href', 'https://www.leftcom.org/');
    await expect(ict).toHaveAttribute('rel', /noopener/);
    await expect(ict).toHaveAttribute('target', '_blank');
    await expectVisible(
      page,
      page.locator('a.link-name', { hasText: 'Marxists Internet Archive' }),
    );
  });

  test('localises the heading for Russian', async ({ page }) => {
    await visit(page, '/ru/links');
    await expect(page.locator('h1')).toHaveText(/Ресурсы и союзники/);
  });

  test('is reachable from the footer link', async ({ page }) => {
    await visit(page, '/en');
    const footerLink = page.getByTestId('footer-links-page');
    await expectVisible(page, footerLink);
    await expect(footerLink).toHaveAttribute('href', '/en/links');
  });
});
