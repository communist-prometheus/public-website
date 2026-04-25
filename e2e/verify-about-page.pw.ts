import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { expect, test } from '@playwright/test';

/**
 * Manual prod probe for the new About page split.
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
    test.setTimeout(120_000);

    await page.goto(`${PROD}/${lang}`, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.screenshot({ path: `${SHOTS}/${lang}-home.png`, fullPage: true });

    // Read-more CTA inside the Hero section.
    const cta = page.locator(`section.hero a.hero-cta[href="/${lang}/about"]`);
    await expect(cta).toBeVisible();
    await expect(cta).toContainText(words.readMore);

    // About link in the desktop nav.
    const aboutNavLink = page
      .locator(`[data-testid="desktop-nav"] a[href="/${lang}/about"]`)
      .first();
    await expect(aboutNavLink).toContainText(words.aboutLabel);

    // CTA navigates to /{lang}/about.
    await cta.click();
    await page.waitForURL(new RegExp(`/${lang}/about/?$`), { timeout: 15_000 });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
    await expect(page.locator('h1').first()).toContainText(words.aboutTitle);
    await page.screenshot({ path: `${SHOTS}/${lang}-about.png`, fullPage: true });
  });
}
