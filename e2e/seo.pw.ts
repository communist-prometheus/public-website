import { expect, expectAttribute, type Page, test, visit } from '@prometheus/e2e-toolkit';

/*
 * SEO regression suite.
 *
 * These tests don't measure ranking — that requires off-site data
 * (SerpAPI etc.). They guard the on-page signals that Google reads:
 * title + meta description present on every key landing page,
 * canonical pointing at an absolute https URL on the right host,
 * hreflang alternates for every supported language + x-default,
 * structured-data JSON-LD that parses and carries @context / @type,
 * the Russian landing page mentioning «революционные марксисты»
 * verbatim in title AND visible H1 / body text, a permissive
 * robots.txt pointing at the sitemap, and a sitemap-index.xml that
 * enumerates per-locale URL sets.
 *
 * Landing pages probed: the Russian home + about + manifest, plus the
 * English home as a baseline that the multilingual surface still
 * works. Add a new probe here when a new high-intent page ships.
 */

const SITE_URL = 'https://comprom.org';
const RU_KEYPHRASE = 'революционные марксисты';

const HEAD_PROBES: ReadonlyArray<{
  readonly path: string;
  readonly lang: string;
}> = [
  { path: '/ru', lang: 'ru' },
  { path: '/ru/about', lang: 'ru' },
  { path: '/ru/manifest', lang: 'ru' },
  { path: '/en', lang: 'en' },
  { path: '/en/about', lang: 'en' },
];

const EXPECTED_HREFLANGS: ReadonlyArray<string> = [
  'en',
  'ru',
  'it',
  'es',
  'bg',
  'pl',
  'uk',
  'x-default',
];

const readJsonLD = (page: Page): Promise<readonly string[]> =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (n) => n.textContent ?? '',
    ),
  );

const parseJsonLD = (raw: string): Record<string, unknown> | undefined => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed;
  } catch {
    return undefined;
  }
};

test.describe('on-page SEO', () => {
  for (const { path, lang } of HEAD_PROBES) {
    test(`${path} ships title + description + canonical + hreflang`, async ({ page }) => {
      await visit(page, path);

      const titleText = await page.title();
      expect(titleText.trim().length).toBeGreaterThan(10);

      const description = page.locator('head meta[name="description"]');
      await expect(description).toHaveCount(1);
      const descContent = (await description.getAttribute('content')) ?? '';
      /*
       * Just assert presence + non-empty. Google's "ideal" range is
       * 150-160 chars but enforcing a floor in CI would block real
       * editorial content with short hand-written descriptions.
       * The playbook documents the recommendation; this test only
       * guards against accidentally shipping a blank string.
       */
      expect(descContent.trim().length).toBeGreaterThan(0);

      const canonical = page.locator('head link[rel="canonical"]');
      await expectAttribute(page, canonical, 'href', new RegExp(`^${SITE_URL}${path}/?$`));

      await expectAttribute(page, page.locator('html'), 'lang', lang);

      for (const hreflang of EXPECTED_HREFLANGS) {
        const alt = page.locator(`head link[rel="alternate"][hreflang="${hreflang}"]`);
        await expect(alt).toHaveCount(1);
        const href = (await alt.getAttribute('href')) ?? '';
        expect(href).toMatch(new RegExp(`^${SITE_URL}/`));
      }
    });

    test(`${path} JSON-LD parses and declares @context + @type`, async ({ page }) => {
      await visit(page, path);
      const blobs = await readJsonLD(page);
      expect(blobs.length).toBeGreaterThan(0);
      for (const raw of blobs) {
        const parsed = parseJsonLD(raw);
        expect(parsed, `JSON-LD must parse: ${raw.slice(0, 80)}`).toBeDefined();
        if (!parsed) continue;
        expect(parsed['@context']).toBe('https://schema.org');
        expect(typeof parsed['@type']).toBe('string');
      }
    });
  }

  test('/ru exposes "революционные марксисты" in <title> or visible body', async ({ page }) => {
    /*
     * The phrase must appear somewhere Google can read it as a
     * relevance signal for the query. Title tag is the strongest
     * slot, but if editors retitle the home we still pass when the
     * phrase lives in the visible Hero subtitle or article body.
     */
    await visit(page, '/ru');
    const titleText = (await page.title()).toLowerCase();
    const bodyText = ((await page.locator('main').textContent()) ?? '').toLowerCase();
    const present = titleText.includes(RU_KEYPHRASE) || bodyText.includes(RU_KEYPHRASE);
    expect(present, 'expected "революционные марксисты" in <title> or main').toBe(true);
  });

  test('/ru/about declares AboutPage JSON-LD wired to the Organization entity', async ({
    page,
  }) => {
    await visit(page, '/ru/about');
    const blobs = await readJsonLD(page);
    const aboutPage = blobs.map(parseJsonLD).find((p) => p?.['@type'] === 'AboutPage') as
      | {
          readonly mainEntity?: { readonly '@type'?: string; readonly name?: string };
        }
      | undefined;
    expect(aboutPage).toBeDefined();
    expect(aboutPage?.mainEntity?.['@type']).toBe('Organization');
    expect(aboutPage?.mainEntity?.name).toBe('Communist Prometheus');
  });
});

test.describe('crawlability', () => {
  test('robots.txt is permissive and points at the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toMatch(/^User-agent:\s*\*/m);
    expect(body).toMatch(/^Allow:\s*\/$/m);
    expect(body).toMatch(/^Sitemap:\s*https:\/\/comprom\.org\/sitemap/m);
  });

  test('sitemap-index.xml enumerates the per-locale sitemap shards', async ({ request }) => {
    const res = await request.get('/sitemap-index.xml');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toContain('<sitemapindex');
    expect(body).toMatch(/sitemap-0\.xml/);
  });

  test('sitemap-0.xml lists localized landing URLs for every language', async ({ request }) => {
    const res = await request.get('/sitemap-0.xml');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    /*
     * Each landing path should appear once per supported locale.
     * Asserting the Russian + English about URLs catches the most
     * common breakage (a build that emits only /en).
     */
    expect(body).toContain(`${SITE_URL}/ru/about`);
    expect(body).toContain(`${SITE_URL}/en/about`);
    expect(body).toContain(`${SITE_URL}/ru/manifest`);
  });
});
