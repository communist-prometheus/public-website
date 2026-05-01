import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test, visit } from '@prometheus/e2e-toolkit';
import { playAudit } from 'playwright-lighthouse';

const LIGHTHOUSE_THRESHOLDS = {
  performance: 100,
  accessibility: 100,
  'best-practices': 100,
  seo: 100,
};

const MOBILE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile' as const,
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
      disabled: false,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    emulatedUserAgent:
      'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  },
};

const DESKTOP_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop' as const,
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
  },
};

const discoverPages = (
  distDir: string,
  lang: string,
): ReadonlyArray<{ readonly name: string; readonly path: string }> => {
  const langDir = join(distDir, lang);
  const pages: Array<{ name: string; path: string }> = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (entry === 'index.html') {
        const routePath = `/${relative(distDir, dir).replaceAll('\\', '/')}`;
        const name = routePath === `/${lang}` ? 'Home' : routePath.replace(`/${lang}/`, '');
        pages.push({ name, path: routePath });
      }
    }
  };

  walk(langDir);
  return pages.sort((a, b) => a.path.localeCompare(b.path));
};

const DIST_DIR = join(import.meta.dirname, '..', 'dist');
const PAGES = discoverPages(DIST_DIR, 'en');

const slugify = (name: string): string => name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');

test.describe('Lighthouse mobile audit', () => {
  for (const { name, path } of PAGES) {
    test(`${name} — mobile (${path})`, async ({ page }) => {
      await visit(page, path);

      await playAudit({
        page,
        port: 9222,
        thresholds: LIGHTHOUSE_THRESHOLDS,
        config: MOBILE_CONFIG,
        reports: {
          formats: { html: true },
          name: `lighthouse-mobile-${slugify(name)}`,
          directory: 'e2e/lighthouse-reports',
        },
      });
    });
  }
});

test.describe('Lighthouse desktop audit', () => {
  for (const { name, path } of PAGES) {
    test(`${name} — desktop (${path})`, async ({ page }) => {
      await visit(page, path);

      await playAudit({
        page,
        port: 9222,
        thresholds: LIGHTHOUSE_THRESHOLDS,
        config: DESKTOP_CONFIG,
        reports: {
          formats: { html: true },
          name: `lighthouse-desktop-${slugify(name)}`,
          directory: 'e2e/lighthouse-reports',
        },
      });
    });
  }
});
