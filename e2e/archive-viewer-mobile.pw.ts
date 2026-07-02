import { expect, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/*
 * Archive viewer — mobile. Runs under playwright.config.ts's `mobile` project
 * (viewport 375x812, hasTouch: true, isMobile: true). Selectors follow the
 * wfr-host-astro shell (dialog.viewer-dialog + .slide + #fs-button).
 *
 * Guards the "on mobile the dialog does not cover the page and prev/next
 * float over the archive index" regression that the earlier fullscreen +
 * auto-hide refactor introduced.
 */

const ARCHIVE = '/en/archive/founding-documents/';
const DIALOG = 'dialog.viewer-dialog';

test.describe('archive viewer covers the viewport on mobile', () => {
  test('dialog fills the visible viewport (no page content bleeds through)', async ({ page }) => {
    await visit(page, `${ARCHIVE}#asset=flag.svg`);
    await expectVisible(page, page.locator(DIALOG));

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

    expect(geom.left, `dialog.left = ${geom.left}`).toBe(0);
    expect(geom.top, `dialog.top = ${geom.top}`).toBe(0);
    expect(geom.width, `dialog.width = ${geom.width}, viewport = ${geom.vw}`).toBe(geom.vw);
    expect(
      geom.height,
      `dialog.height = ${geom.height}, viewport = ${geom.vh}`,
    ).toBeGreaterThanOrEqual(geom.vh);
  });

  test('the archive page heading is NOT hit-testable while the viewer is open', async ({
    page,
  }) => {
    await visit(page, `${ARCHIVE}#asset=flag.svg`);
    await expectVisible(page, page.locator(DIALOG));

    const covered = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1 === null) return { covered: false, reason: 'no h1' };
      const rect = h1.getBoundingClientRect();
      const el = document.elementFromPoint(
        Math.round(rect.left + rect.width / 2),
        Math.round(rect.top + rect.height / 2),
      );
      return {
        covered: el !== h1 && el?.closest('dialog.viewer-dialog') !== null,
        elTag: el?.tagName ?? null,
      };
    });
    expect(covered.covered, JSON.stringify(covered)).toBe(true);
  });

  test('opening from a tile on mobile still covers the viewport', async ({ page }) => {
    await visit(page, ARCHIVE);
    /*
     * <wfr-file-grid> renders <wfr-file-tile> children in its shadow root;
     * Playwright's default engines pierce shadow roots so we can tap by tag.
     */
    await page.locator('wfr-file-tile').first().tap();
    await expectVisible(page, page.locator(DIALOG));
    const geom = await page.locator(DIALOG).evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, vw: window.innerWidth };
    });
    expect(Math.round(geom.left)).toBe(0);
    expect(Math.round(geom.top)).toBe(0);
    expect(Math.round(geom.width)).toBe(Math.round(geom.vw));
  });

  /*
   * The regression in the user's screenshot: fullscreen went onto
   * documentElement, and the dialog stayed anchored to the pre-fullscreen
   * viewport rectangle so the archive page was visible around it. Guard
   * that the fullscreen call goes to the dialog, not documentElement.
   * Headless Chromium can't actually engage fullscreen, so we spy on the
   * API call — the call is the contract.
   */
  test('fullscreen requests the DIALOG (never documentElement)', async ({ page }) => {
    await page.addInitScript(() => {
      interface FsCall {
        target: 'dialog' | 'html' | 'other';
        tag: string;
      }
      (window as unknown as { __fsCalls: FsCall[] }).__fsCalls = [];
      const orig = Element.prototype.requestFullscreen;
      Element.prototype.requestFullscreen = function (this: Element, options?: FullscreenOptions) {
        const target: FsCall['target'] =
          this instanceof HTMLDialogElement
            ? 'dialog'
            : this === document.documentElement
              ? 'html'
              : 'other';
        (window as unknown as { __fsCalls: FsCall[] }).__fsCalls.push({
          target,
          tag: this.tagName,
        });
        return orig.call(this, options);
      };
    });

    await visit(page, `${ARCHIVE}#asset=flag.svg`);
    await expectVisible(page, page.locator(DIALOG));

    await page.locator('#fs-button').tap();

    const calls = await page.evaluate(
      () => (window as unknown as { __fsCalls: { target: string; tag: string }[] }).__fsCalls,
    );
    expect(calls.length, `no requestFullscreen calls: ${JSON.stringify(calls)}`).toBeGreaterThan(0);
    expect(calls[0]?.target, `first fs call target: ${JSON.stringify(calls)}`).toBe('dialog');
    expect(
      calls.some((c) => c.target === 'html'),
      `documentElement fallback re-appeared: ${JSON.stringify(calls)}`,
    ).toBe(false);
  });
});
