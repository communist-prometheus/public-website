import { expect, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/*
 * Archive viewer — fullscreen. Runs under the `fullscreen` project (headed
 * Chromium) because headless silently rejects `requestFullscreen()` — the
 * chromium project's fullscreen test can only spy on the API call target.
 *
 * These tests verify the REAL contract the user cares about: after clicking
 * #fs-button, `document.fullscreenElement` becomes non-null AND the dialog
 * gets `data-fs` set so its CSS forces it to fill the fullscreen viewport
 * (guards against the earlier documentElement-fullscreen layout regression
 * where the dialog stayed anchored to its pre-fullscreen box).
 */

const ARCHIVE = '/en/archive/founding-documents/';
const DIALOG = 'dialog.viewer-dialog';

test('clicking #fs-button engages real fullscreen', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=flag.svg`);
  await expectVisible(page, page.locator(DIALOG));

  const before = await page.evaluate(() => document.fullscreenElement !== null);
  expect(before, 'fullscreen must not already be engaged before the click').toBe(false);

  await page.locator('#fs-button').click({ force: true });
  /*
   * The Fullscreen API resolves the request asynchronously — Chromium fires
   * `fullscreenchange` on the next microtask + layout pass. Wait for the
   * state to flip, not on a fixed timer.
   */
  await page.waitForFunction(() => document.fullscreenElement !== null, undefined, {
    timeout: 5000,
  });
  await page.waitForFunction(
    () => document.querySelector('dialog.viewer-dialog')?.hasAttribute('data-fs') === true,
    undefined,
    { timeout: 2000 },
  );

  const state = await page.evaluate(() => ({
    fsTag: document.fullscreenElement?.tagName ?? null,
    dialogHasFs: document.querySelector('dialog.viewer-dialog')?.hasAttribute('data-fs') ?? false,
  }));
  expect(state.fsTag, 'document.fullscreenElement must be set').not.toBeNull();
  expect(state.dialogHasFs, 'dialog must carry data-fs so CSS fills the viewport').toBe(true);
});

test('data-fs forces the dialog to fill the fullscreen viewport (no side bleed)', async ({
  page,
}) => {
  await visit(page, `${ARCHIVE}#asset=flag.svg`);
  await expectVisible(page, page.locator(DIALOG));

  await page.locator('#fs-button').click({ force: true });
  await page.waitForFunction(() => document.fullscreenElement !== null, undefined, {
    timeout: 5000,
  });
  await page.waitForFunction(
    () => document.querySelector('dialog.viewer-dialog')?.hasAttribute('data-fs') === true,
    undefined,
    { timeout: 2000 },
  );

  const geom = await page.locator(DIALOG).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
  /*
   * Under fullscreen the dialog must fill the viewport minus at most the
   * reserved scrollbar-gutter (~17 px on Windows Chromium). The regression
   * this test guards is HUNDREDS of pixels of page bleeding around the
   * pre-fullscreen `min(64rem, 95vw)` card — not the reserved gutter.
   */
  expect(geom.left, `dialog.left = ${geom.left}`).toBeLessThanOrEqual(2);
  expect(geom.top, `dialog.top = ${geom.top}`).toBeLessThanOrEqual(2);
  expect(geom.width, `dialog.width = ${geom.width}, viewport = ${geom.vw}`).toBeGreaterThanOrEqual(
    geom.vw - 20,
  );
  expect(
    geom.height,
    `dialog.height = ${geom.height}, viewport = ${geom.vh}`,
  ).toBeGreaterThanOrEqual(geom.vh - 20);
});

test('a second click on #fs-button exits fullscreen and clears data-fs', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=flag.svg`);
  await expectVisible(page, page.locator(DIALOG));

  await page.locator('#fs-button').click({ force: true });
  await page.waitForFunction(() => document.fullscreenElement !== null, undefined, {
    timeout: 5000,
  });

  await page.locator('#fs-button').click({ force: true });
  await page.waitForFunction(() => document.fullscreenElement === null, undefined, {
    timeout: 5000,
  });

  const state = await page.evaluate(() => ({
    fsElement: document.fullscreenElement,
    dialogHasFs: document.querySelector('dialog.viewer-dialog')?.hasAttribute('data-fs') ?? false,
  }));
  expect(state.fsElement).toBeNull();
  expect(state.dialogHasFs, 'data-fs must be cleared on exit').toBe(false);
});
