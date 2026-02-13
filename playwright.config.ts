import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
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
      testIgnore: ['**/lighthouse.pw.ts', '**/mobile.pw.ts'],
    },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
      testMatch: '**/mobile.pw.ts',
    },
    {
      name: 'lighthouse',
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
