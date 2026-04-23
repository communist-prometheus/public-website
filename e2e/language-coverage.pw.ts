import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Regression: every language in settings/languages.json must (a) appear
 * in the switcher, (b) have a working /{code}/ route, (c) render with
 * the correct <html lang> attribute, (d) keep all five top-level pages
 * reachable. Previously a "ready-language" filter silently hid any
 * freshly-added code and emitted zero static paths for it, leaving
 * the new-language flow broken on prod.
 */

const here = dirname(fileURLToPath(import.meta.url));
const settingsPath = join(here, '..', 'src', 'content', 'settings', 'languages.json');

interface LangEntry {
  readonly code: string;
  readonly label: string;
}

const languages = JSON.parse(readFileSync(settingsPath, 'utf8')) as LangEntry[];
const codes = languages.map((l) => l.code);
const paths = ['', '/manifest', '/blog', '/positions', '/newspaper'] as const;

const switcherSel = 'header .desktop-only [data-testid="language-switcher"]';

test.describe('Language coverage — every code in settings must work', () => {
  for (const { code, label } of languages) {
    test.describe(`${label} (${code})`, () => {
      for (const p of paths) {
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
