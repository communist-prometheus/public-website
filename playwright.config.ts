import process from 'node:process';
import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';

const { CI } = process.env;
const ciWorkers: Pick<PlaywrightTestConfig, 'workers'> = CI ? { workers: 4 } : {};

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  fullyParallel: true,
  retries: 0,
  ...ciWorkers,
  reporter: 'list',
  /*
   * Per-test ceiling. Each network-aware wait inside the toolkit
   * already self-aborts at 10 s; this is a backstop in case Playwright
   * itself wedges on an action.
   */
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4327',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
      /*
       * `verify-*.pw.ts` are prod-only probes that hit
       * https://comprom.org directly via `playwright.config.prod.ts`.
       * They must NOT run inside the deploy job's e2e step — the deploy
       * is what brings the change to prod, so a probe asserting that
       * change would always fail until the deploy completes. (See
       * `e2e/verify-newspaper-asset-headers.pw.ts` — the FB2 headers
       * probe ran during the deploy that was supposed to fix them
       * and went red on the live URL that was still the old build.)
       */
      testIgnore: [
        '**/lighthouse.pw.ts',
        '**/mobile.pw.ts',
        '**/*-mobile.pw.ts',
        '**/*-fullscreen.pw.ts',
        '**/verify-*.pw.ts',
      ],
    },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
      testMatch: ['**/mobile.pw.ts', '**/*-mobile.pw.ts'],
    },
    {
      /*
       * Fullscreen tests need a headed Chromium (headless silently rejects
       * requestFullscreen) so `document.fullscreenElement` actually becomes
       * non-null. Kept in its own project so a headless CI can skip it via
       * `--project=chromium` and still get the rest of the suite.
       */
      name: 'fullscreen',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          headless: false,
          channel: 'chromium',
        },
      },
      testMatch: '**/*-fullscreen.pw.ts',
    },
    {
      name: 'lighthouse',
      /*
       * playwright-lighthouse pins port 9222, so two workers fight for
       * the same socket and the loser dies before audit. Force serial
       * execution within the project — other projects keep running in
       * parallel via the global worker pool.
       */
      fullyParallel: false,
      /*
       * Each Lighthouse audit boots Chromium, runs the full report, and
       * writes HTML — easily 30–60 s on positions/manifest pages. Bump
       * to 120 s so genuine perf budget regressions, not test timeouts,
       * are what fails this suite.
       */
      timeout: 120_000,
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: ['--remote-debugging-port=9222'],
        },
      },
      testMatch: '**/lighthouse.pw.ts',
    },
  ],
  webServer: {
    command: 'bun run astro preview --port 4327',
    port: 4327,
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
