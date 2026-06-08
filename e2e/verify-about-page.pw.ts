import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { click, expectText, expectVisible, test, visit, waitForUrl } from '@prometheus/e2e-toolkit';

/**
 * Manual prod probe for the About page split.
 *
 * Asserts: /{lang} home shows compact Hero (heroTitle + subtitle) +
 * a "Read more" CTA, /{lang}/about renders the full About content
 * with title and prose body, and the site nav has a localised About
 * link.
 */
const PROD = process.env['PROBE_BASE_URL'] ?? 'https://comprom.org';
const SHOTS = resolve(process.cwd(), 'screenshots/about-verify');
mkdirSync(SHOTS, { recursive: true });

const LANGS: Record<
  string,
  { readonly aboutLabel: RegExp; readonly readMore: RegExp; readonly aboutTitle: RegExp }
> = {
  en: { aboutLabel: /^About$/, readMore: /read more/i, aboutTitle: /About us/i },
  ru: { aboutLabel: /О нас/, readMore: /читать далее/i, aboutTitle: /О нас/ },
  it: { aboutLabel: /Chi siamo/, readMore: /leggi di più/i, aboutTitle: /Chi siamo/ },
  es: { aboutLabel: /Sobre nosotros/, readMore: /leer más/i, aboutTitle: /Sobre nosotros/ },
};

for (const [lang, words] of Object.entries(LANGS)) {
  test(`prod ${lang}: home Hero compact, About link in nav, /about renders`, async ({ page }) => {
    await visit(page, `${PROD}/${lang}`);
    await expectVisible(page, page.locator('h1').first());
    await page.screenshot({ path: `${SHOTS}/${lang}-home.png`, fullPage: true });

    const cta = page.locator(`section.hero a.hero-cta[href="/${lang}/about"]`);
    await expectVisible(page, cta);
    await expectText(page, cta, words.readMore);

    const aboutNavLink = page
      .locator(`[data-testid="desktop-nav"] a[href="/${lang}/about"]`)
      .first();
    await expectText(page, aboutNavLink, words.aboutLabel);

    await click(page, cta);
    await waitForUrl(page, new RegExp(`/${lang}/about/?$`));
    await expectVisible(page, page.locator('h1').first());
    await expectText(page, page.locator('h1').first(), words.aboutTitle);
    await page.screenshot({ path: `${SHOTS}/${lang}-about.png`, fullPage: true });
  });
}
