import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Regression: every language in settings/languages.json must (a) appear
 * in the switcher, (b) have a working /{code}/ route + /{code}/{page}
 * for every top-level page, (c) render with the correct <html lang>
 * attribute, (d) have working detail pages for blog / positions that
 * fall back to the default-language content, (e) survive an actual
 * switcher click from any page to any other language WITHOUT landing
 * on a 404. Previously a "ready-language" filter silently hid any
 * freshly-added code and emitted zero static paths for it, and even
 * after that fix a click from /en/blog/<slug> to /uk/ landed on a 404
 * because the per-article route was not emitted for the new language.
 */

const here = dirname(fileURLToPath(import.meta.url));
const settingsPath = join(here, '..', 'src', 'content', 'settings', 'languages.json');

interface LangEntry {
  readonly code: string;
  readonly label: string;
}

const languages = JSON.parse(readFileSync(settingsPath, 'utf8')) as LangEntry[];
const codes = languages.map((l) => l.code);
const pages = ['', '/manifest', '/blog', '/positions', '/newspaper'] as const;

const switcherSel = 'header .desktop-only [data-testid="language-switcher"]';

test.describe('Language coverage — every code in settings must work', () => {
  for (const { code, label } of languages) {
    test.describe(`${label} (${code})`, () => {
      for (const p of pages) {
        test(`/${code}${p} renders with lang="${code}"`, async ({ page }) => {
          const res = await page.goto(`/${code}${p}`, {
            waitUntil: 'domcontentloaded',
          });
          expect(res?.status(), `status for /${code}${p}`).toBeLessThan(400);
          const htmlLang = await page.locator('html').first().getAttribute('lang');
          expect(htmlLang).toBe(code);
          await expect(page.locator('h1').first()).toBeVisible();
        });
      }

      test(`switcher on /en offers ${code}`, async ({ page }) => {
        await page.goto('/en');
        await page.locator(switcherSel).click();
        const option = page.locator(`${switcherSel} [data-testid="lang-option-${code}"]`);
        await expect(option).toBeVisible();
      });
    });
  }

  test('switcher surfaces every settings language, no more, no fewer', async ({ page }) => {
    await page.goto('/en');
    await page.locator(switcherSel).click();
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
   * The top header nav is driven by getNavLinks(lang), which in turn
   * reads common/menu. Without a per-language fallback the nav
   * silently disappeared on every page whose language had no menu
   * translation — the visible break the user filed the bug about.
   */
  const probes = [
    '/',
    '/manifest',
    '/blog',
    '/positions',
    '/newspaper',
    '/blog/welcome-to-prometheus',
  ] as const;

  for (const code of codes) {
    for (const p of probes) {
      test(`/${code}${p} header nav has links`, async ({ page }) => {
        await page.goto(`/${code}${p}`, { waitUntil: 'domcontentloaded' });
        const navLinks = await page
          .locator('[data-testid="desktop-nav"] a')
          .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute('href')));
        expect(navLinks.length, `nav links on /${code}${p}`).toBeGreaterThanOrEqual(4);
        expect(navLinks).toEqual(
          expect.arrayContaining([
            `/${code}`,
            `/${code}/blog`,
            `/${code}/positions`,
            `/${code}/manifest`,
          ]),
        );
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
  const here = [
    '/en/',
    '/en/blog',
    '/en/blog/welcome-to-prometheus',
    '/en/positions/digital-sovereignty',
    '/uk/blog/welcome-to-prometheus',
  ] as const;

  for (const from of here) {
    for (const target of codes) {
      test(`href on ${from} for ${target} preserves path`, async ({ page }) => {
        await page.goto(from, { waitUntil: 'domcontentloaded' });
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

test.describe('Language coverage — detail pages do not 404 on new langs', () => {
  const detailProbes = [
    '/blog/welcome-to-prometheus',
    '/blog/modern-web-development',
    '/positions/digital-sovereignty',
  ] as const;

  for (const code of codes) {
    for (const detail of detailProbes) {
      test(`/${code}${detail} renders (fallback OK)`, async ({ page }) => {
        const res = await page.goto(`/${code}${detail}`, {
          waitUntil: 'domcontentloaded',
        });
        expect(res?.status(), `status for /${code}${detail}`).toBeLessThan(400);
        await expect(page.locator('h1').first()).toBeVisible();
      });
    }
  }
});

test.describe('Language coverage — switcher click never lands on 404', () => {
  /*
   * A compact but representative matrix so this test finishes quickly.
   * Covers the two classes that used to break: a new language as the
   * target (uk, bl, pl, it) and a listing / article page as the start.
   */
  const clicks: readonly { readonly from: string; readonly target: string }[] = [
    { from: '/en/', target: 'uk' },
    { from: '/en/blog', target: 'uk' },
    { from: '/en/blog/welcome-to-prometheus', target: 'uk' },
    { from: '/en/positions/digital-sovereignty', target: 'uk' },
    { from: '/ru/blog', target: 'bl' },
    { from: '/uk/blog/welcome-to-prometheus', target: 'en' },
    { from: '/pl/manifest', target: 'it' },
    { from: '/bl/', target: 'pl' },
  ];

  for (const { from, target } of clicks) {
    test(`${from} → click ${target} stays < 400`, async ({ page }) => {
      const documentStatuses: number[] = [];
      page.on('response', (resp) => {
        if (resp.request().resourceType() === 'document') {
          documentStatuses.push(resp.status());
        }
      });
      await page.goto(from, { waitUntil: 'domcontentloaded' });
      await page.locator(switcherSel).click();
      await page.locator(`${switcherSel} [data-testid="lang-option-${target}"]`).click();
      await page.waitForURL(new RegExp(`/${target}(/|$)`), { timeout: 10_000 });
      const last = documentStatuses.at(-1);
      expect(last, `last document status for ${from} → ${target}`).toBeLessThan(400);
      await expect(page.locator('h1').first()).toBeVisible();
      // Nav must also reflect the new language. The visible bug was
      // that clicking uk moved the URL but the header nav still
      // said Home→/en, Blog→/en/blog because
      // <header transition:persist> froze it at the landing page.
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
