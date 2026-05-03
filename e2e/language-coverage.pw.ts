import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  click,
  expect,
  expectVisible,
  test,
  visit,
  waitForCondition,
} from '@prometheus/e2e-toolkit';
import { buildSectionAvailability, hasSection } from './helpers/content-coverage';

/*
 * Regression: every language in settings/languages.json must (a)
 * appear in the switcher, (b) have a working /{code}/ route +
 * /{code}/{page} for every top-level page, (c) render with the
 * correct <html lang> attribute, (d) have working detail pages for
 * blog / positions that fall back to the default-language content,
 * (e) survive an actual switcher click from any page to any other
 * language WITHOUT landing on a 404.
 */

const here = dirname(fileURLToPath(import.meta.url));
const settingsPath = join(here, '..', 'src', 'content', 'settings', 'languages.json');

interface LangEntry {
  readonly code: string;
  readonly label: string;
}

const languages = JSON.parse(readFileSync(settingsPath, 'utf8')) as LangEntry[];
const codes = languages.map((l) => l.code);
const sectionByPath: Readonly<Record<string, string>> = {
  '': 'home',
  '/manifest': 'manifest',
  '/blog': 'blog',
  '/positions': 'positions',
  '/newspaper': 'newspaper',
};
const pages = Object.keys(sectionByPath);
const availability = buildSectionAvailability();

const switcherSel = 'header .desktop-only [data-testid="language-switcher"]';

test.describe('Language coverage — every code in settings must work', () => {
  for (const { code, label } of languages) {
    test.describe(`${label} (${code})`, () => {
      /*
       * After PR #74 (empty-section gating) sections without
       * published content for this lang 404 by design — that's the
       * editor's contract. Skip those tuples; the existing-section
       * tuples still assert the lang attr + h1 is rendered.
       */
      for (const p of pages) {
        const section = sectionByPath[p] ?? 'home';
        const exists = hasSection(availability, code, section);
        const variant = exists ? test : test.skip;
        variant(`/${code}${p} renders with lang="${code}"`, async ({ page }) => {
          const res = await visit(page, `/${code}${p}`);
          expect(res?.status(), `status for /${code}${p}`).toBeLessThan(400);
          const htmlLang = await page.locator('html').first().getAttribute('lang');
          expect(htmlLang).toBe(code);
          await expectVisible(page, page.locator('h1').first());
        });
      }

      test(`switcher on /en offers ${code}`, async ({ page }) => {
        await visit(page, '/en');
        await click(page, page.locator(switcherSel));
        const option = page.locator(`${switcherSel} [data-testid="lang-option-${code}"]`);
        await expectVisible(page, option);
      });
    });
  }

  test('switcher surfaces every settings language, no more, no fewer', async ({ page }) => {
    await visit(page, '/en');
    await click(page, page.locator(switcherSel));
    const rendered = await page
      .locator(`${switcherSel} [data-testid^="lang-option-"]`)
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-testid')?.replace('lang-option-', '')),
      );
    expect(new Set(rendered)).toEqual(new Set(codes));
  });
});

test.describe('Language coverage — every page has a full header nav', () => {
  /*
   * Top-header nav is driven by getNavLinks(lang) which reads
   * common/menu. Without per-language fallback the nav silently
   * disappeared on every page whose language had no menu translation.
   */
  /*
   * Blog detail probes are intentionally omitted — the corpus carries
   * only `ru` + `it` translations, so en/es/uk/bl/pl detail URLs
   * legitimately 404. The listing probes still cover the
   * per-language nav rendering on every code.
   */
  /*
   * The set of nav links is now lang-conditional: empty sections
   * are dropped (PR #74). Derive the expected links from the
   * availability map so the assertion matches the editor-visible
   * truth.
   */
  const sectionToLink = (code: string, section: string): string =>
    section === 'home' ? `/${code}` : `/${code}/${section}`;

  for (const code of codes) {
    const sections = availability.get(code) ?? new Set<string>();
    if (sections.size === 0) continue;
    const expectedLinks = [...sections].map((s) => sectionToLink(code, s));
    for (const section of sections) {
      const path = section === 'home' ? '' : `/${section}`;
      test(`/${code}${path === '' ? '/' : path} header nav has links`, async ({ page }) => {
        await visit(page, `/${code}${path}`);
        const navLinks = await page
          .locator('[data-testid="desktop-nav"] a')
          .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute('href')));
        expect(navLinks).toEqual(expect.arrayContaining(expectedLinks));
      });
    }
  }
});

test.describe('Language coverage — switcher href is path-aware', () => {
  /*
   * The switcher <a href> must preserve the current path, not point
   * at /{code}. Otherwise middle-click / right-click / Ctrl+click /
   * pre-hydration click drops the user on the language root instead
   * of the same article in the new language.
   */
  /*
   * Detail-page probes use the `ru` slug because that's where the
   * corpus carries the article. The listing probes (`/en/`,
   * `/en/blog`) cover the chrome that exists in every language.
   */
  const fromPaths = [
    '/en/',
    '/en/blog',
    '/ru/blog/appeal-to-russian-workers',
    '/en/positions/digital-sovereignty',
    '/it/blog/appeal-to-russian-workers',
  ] as const;

  for (const from of fromPaths) {
    for (const target of codes) {
      test(`href on ${from} for ${target} preserves path`, async ({ page }) => {
        await visit(page, from);
        const href = await page
          .locator(`${switcherSel} [data-testid="lang-option-${target}"]`)
          .first()
          .getAttribute('href');
        const expected = from.replace(/^\/[a-z]{2}/, `/${target}`).replace(/\/$/, '');
        const normalised = (href ?? '').replace(/\/$/, '');
        const wanted = expected === '' ? `/${target}` : expected;
        expect(normalised, `href on ${from} for ${target}`).toBe(wanted);
      });
    }
  }
});

test.describe('Language coverage — detail pages render where translated', () => {
  /*
   * Per-language detail probes only target codes that actually carry
   * the article in the content repo; the public site does not
   * fall back across languages on detail URLs (a deliberate choice
   * — silent fallback hides translation gaps from editors).
   */
  const detailProbes: ReadonlyArray<{
    readonly code: string;
    readonly detail: string;
  }> = [
    { code: 'ru', detail: '/blog/appeal-to-russian-workers' },
    { code: 'it', detail: '/blog/appeal-to-russian-workers' },
    { code: 'ru', detail: '/blog/iran-imperialism-crisis' },
    { code: 'it', detail: '/blog/iran-imperialism-crisis' },
    /*
     * positions/digital-sovereignty existed in earlier corpora but
     * the editor has since cleared the positions collection. The
     * blog probes above are enough to cover the cross-language
     * detail-page render; positions probes were repointed when the
     * editor emptied the list.
     */
  ];

  for (const { code, detail } of detailProbes) {
    test(`/${code}${detail} renders`, async ({ page }) => {
      const res = await visit(page, `/${code}${detail}`);
      expect(res?.status(), `status for /${code}${detail}`).toBeLessThan(400);
      await expectVisible(page, page.locator('h1').first());
    });
  }
});

test.describe('Language coverage — switcher click never lands on 404', () => {
  /*
   * Source paths must exist in the master content snapshot — empty
   * sections 404 by design now. Filter the hardcoded matrix
   * through the availability map: drop any source whose section is
   * absent for that lang. Detail-page sources stay (they reference
   * specific known articles).
   */
  const sourceSection = (path: string): string => {
    if (path === '/' || /^\/[a-z]{2}\/?$/.test(path)) return 'home';
    const m = path.match(/^\/[a-z]{2}\/([a-z-]+)/);
    return m?.[1] ?? 'home';
  };
  const isLive = (from: string): boolean => {
    const lang = from.match(/^\/([a-z]{2})/)?.[1] ?? 'en';
    /* Detail-page sources are slug-specific, allow them as-is. */
    if (/^\/[a-z]{2}\/blog\/.+/.test(from)) return hasSection(availability, lang, 'blog');
    return hasSection(availability, lang, sourceSection(from));
  };
  /*
   * Source section must exist for the source lang (so the page
   * loads), AND for the target lang (so after the switcher click
   * the path doesn't 404). When either side is empty the test
   * tuple is dropped; per-section availability is covered above.
   */
  const targetCarries = (from: string, target: string): boolean =>
    hasSection(availability, target, sourceSection(from));
  const clicks = (
    [
      { from: '/en/', target: 'uk' },
      { from: '/en/blog', target: 'uk' },
      { from: '/ru/blog/appeal-to-russian-workers', target: 'it' },
      { from: '/ru/blog', target: 'bl' },
      { from: '/it/blog/appeal-to-russian-workers', target: 'ru' },
      { from: '/pl/manifest', target: 'it' },
      { from: '/bl/', target: 'pl' },
    ] as const
  ).filter(({ from, target }) => isLive(from) && targetCarries(from, target));

  for (const { from, target } of clicks) {
    test(`${from} → click ${target} stays < 400`, async ({ page }) => {
      const documentStatuses: number[] = [];
      page.on('response', (resp) => {
        if (resp.request().resourceType() === 'document') {
          documentStatuses.push(resp.status());
        }
      });
      await visit(page, from);
      await click(page, page.locator(switcherSel));
      await click(page, page.locator(`${switcherSel} [data-testid="lang-option-${target}"]`));
      await waitForCondition(page, async () => new RegExp(`/${target}(/|$)`).test(page.url()));
      const last = documentStatuses.at(-1);
      expect(last, `last document status for ${from} → ${target}`).toBeLessThan(400);
      await expectVisible(page, page.locator('h1').first());
      const navLangs = await page
        .locator('[data-testid="desktop-nav"] a')
        .evaluateAll((els) =>
          els
            .map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? '')
            .map((h) => h.match(/^\/([a-z]{2})/)?.[1]),
        );
      expect(new Set(navLangs), `nav langs after ${from} → ${target}`).toEqual(new Set([target]));
    });
  }
});
