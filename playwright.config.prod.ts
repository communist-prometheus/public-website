import { defineConfig } from '@playwright/test';

/**
 * Prod-only Playwright config used to drive opt-in probes against
 * https://comprom.org without spinning up a local astro preview.
 *
 * Run a probe with:
 *   bun run playwright test e2e/verify-about-page.pw.ts --config playwright.config.prod.ts
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/verify-*.pw.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'prod-chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } },
    },
  ],
});
