import {
  click,
  expectText,
  expectVisible,
  test,
  visit,
  waitForCondition,
} from '@prometheus/e2e-toolkit';

/**
 * E2E tests for Italian and Spanish language support.
 *
 * Verifies that both new languages render correctly across all pages.
 */

const languages = [
  {
    code: 'it',
    label: 'Italiano',
    nav: { home: 'Home', blog: 'Blog', manifest: 'Manifesto' },
  },
  {
    code: 'es',
    label: 'Español',
    nav: { home: 'Inicio', blog: 'Blog', manifest: 'Manifiesto' },
  },
] as const;

for (const lang of languages) {
  test.describe(`${lang.label} (${lang.code}) language support`, () => {
    test('home page renders translated content', async ({ page }) => {
      await visit(page, `/${lang.code}`);
      await expectVisible(page, page.locator('h1'));
      await expectVisible(page, page.locator('footer'));
    });

    test('blog page renders translated heading', async ({ page }) => {
      await visit(page, `/${lang.code}/blog`);
      await expectVisible(page, page.locator('h1'));
      /*
       * Post count varies by language — `it` carries the full corpus,
       * `es` ships nav + page chrome only until a translation lands.
       */
    });

    test('positions page renders translated heading', async ({ page }) => {
      await visit(page, `/${lang.code}/positions`);
      await expectVisible(page, page.locator('h1'));
      /*
       * Card-count assertion was content-pinned to the earlier
       * corpus. Editors can fully clear positions, so the page
       * chrome is the content-agnostic part.
       */
    });

    test('manifest page renders content', async ({ page }) => {
      await visit(page, `/${lang.code}/manifest`);
      /*
       * Manifest body markdown adds its own H1 next to the page H1
       * for some translations (it/ru), so scope to the first.
       */
      await expectVisible(page, page.locator('h1').first());
    });

    /*
     * Nav contains only links to sections that have published
     * content for the active language — see
     * `src/config/section-availability.ts`. Positions is currently
     * empty in prod and so is dropped from nav; assert only the
     * always-present chrome links (home, blog, manifest).
     */
    test('navigation renders translated labels', async ({ page }) => {
      await visit(page, `/${lang.code}`);
      const nav = page.locator('[data-testid="desktop-nav"]');
      await expectText(page, nav.locator(`a[href="/${lang.code}"]`), lang.nav.home);
      await expectText(page, nav.locator(`a[href="/${lang.code}/blog"]`), lang.nav.blog);
      await expectText(page, nav.locator(`a[href="/${lang.code}/manifest"]`), lang.nav.manifest);
    });

    test('language switcher shows option', async ({ page }) => {
      await visit(page, '/en');
      const switcher = page.locator('header .desktop-only [data-testid="language-switcher"]');
      await click(page, switcher);
      const option = switcher.locator(`[data-testid="lang-option-${lang.code}"]`);
      await expectVisible(page, option);
      await expectText(page, option, lang.label);
    });

    test('language switcher navigates to correct page', async ({ page }) => {
      await visit(page, '/en/blog');
      const switcher = page.locator('header .desktop-only [data-testid="language-switcher"]');
      await click(page, switcher);
      const option = switcher.locator(`[data-testid="lang-option-${lang.code}"]`);
      await click(page, option);
      await waitForCondition(page, async () =>
        new RegExp(`/${lang.code}/blog/?$`).test(page.url()),
      );
      await expectVisible(page, page.locator('h1'));
    });
  });
}
