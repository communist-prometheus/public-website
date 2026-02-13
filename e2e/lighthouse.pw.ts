import { test } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

const LIGHTHOUSE_THRESHOLDS = {
  performance: 80,
  accessibility: 90,
  'best-practices': 90,
  seo: 90,
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

const PAGES = [
  { name: 'Home', path: '/en' },
  { name: 'Blog', path: '/en/blog' },
  { name: 'Manifest', path: '/en/manifest' },
];

test.describe('Lighthouse mobile audit', () => {
  for (const { name, path } of PAGES) {
    test(`${name} page meets mobile thresholds`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      await playAudit({
        page,
        port: 9222,
        thresholds: LIGHTHOUSE_THRESHOLDS,
        config: MOBILE_CONFIG,
        reports: {
          formats: { html: true },
          name: `lighthouse-mobile-${name.toLowerCase()}`,
          directory: 'e2e/lighthouse-reports',
        },
      });
    });
  }
});

test.describe('Lighthouse desktop audit', () => {
  for (const { name, path } of PAGES) {
    test(`${name} page meets desktop thresholds`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      await playAudit({
        page,
        port: 9222,
        thresholds: LIGHTHOUSE_THRESHOLDS,
        config: DESKTOP_CONFIG,
        reports: {
          formats: { html: true },
          name: `lighthouse-desktop-${name.toLowerCase()}`,
          directory: 'e2e/lighthouse-reports',
        },
      });
    });
  }
});
