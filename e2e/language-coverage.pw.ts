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
    });
  }
});
