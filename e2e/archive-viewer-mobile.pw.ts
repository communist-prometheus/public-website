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

    /*
     * The dialog is pinned to visualViewport.offsetTop (--app-vt) so its
     * top lives BELOW the address bar and its bottom lives ABOVE the tab
     * bar — Playwright emulates an offsetTop around 12px. That IS the
     * intended geometry: the dialog covers what the user actually sees.
     * The regression this test guards is 30–100+ px of page bleeding
     * through around the dialog, not the intentional visualViewport pin.
     */
    expect(geom.left, `dialog.left = ${geom.left}`).toBeLessThanOrEqual(2);
    expect(
      geom.width,
      `dialog.width = ${geom.width}, viewport = ${geom.vw}`,
    ).toBeGreaterThanOrEqual(geom.vw - 4);
    /* top + height must cover the visible viewport with modest slack. */
    expect(
      geom.top + geom.height,
      `dialog.bottom = ${geom.top + geom.height}, viewport = ${geom.vh}`,
    ).toBeGreaterThanOrEqual(geom.vh - 4);
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
    expect(Math.round(geom.left)).toBeLessThanOrEqual(2);
    expect(Math.round(geom.width)).toBeGreaterThanOrEqual(Math.round(geom.vw) - 4);
  });

  /*
   * Fullscreen on mobile hides the browser address bar and gives the
   * reader ~80 more px. dialog.requestFullscreen() is the correct target
   * — documentElement.requestFullscreen() leaves the dialog anchored to
   * the pre-fullscreen viewport rectangle (regression the user reported).
   * Headless can't actually engage fullscreen; verify the API call target
   * via a spy on Element.prototype.requestFullscreen.
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

    /* fs-button IS visible on mobile (we override the reference's display:none). */
    const display = await page.locator('#fs-button').evaluate((el) => getComputedStyle(el).display);
    expect(display, `#fs-button display = ${display}`).not.toBe('none');

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
