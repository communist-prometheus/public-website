import {
  expect,
  expectHidden,
  expectMinCount,
  expectText,
  expectVisible,
  pressKey,
  test,
  visit,
} from '@prometheus/e2e-toolkit';

/*
 * Archive viewer E2E — 1:1 port of the wfr-host-astro reference. Selectors
 * follow that project's Viewer.astro shell:
 *   dialog.viewer-dialog         — the modal
 *   .slide[aria-current="true"]  — the currently displayed slide in the
 *                                  3-pane scroll-snap carousel
 *   wfr-viewer[state="ready"]    — Lit web component (state="ready" is
 *                                  reflected onto the host element)
 *   #viewer-title                — filename label in the chrome bar
 *   #close-button, #fs-button    — chrome controls
 *   #settings-button, #settings-panel — settings drawer
 *   wfr-viewer-nav               — auto-hiding prev/next controls (has
 *                                  its own inactivity timer + tap toggle;
 *                                  no custom data-attributes on the dialog)
 *
 * Only URL scheme differs from the reference: files live in the hash
 * (`#asset=<name>`) rather than a static `/viewer/<id>` route, so no
 * per-file page has to be generated per album per locale.
 */

const ARCHIVE = '/en/archive/founding-documents/';
const DIALOG = 'dialog.viewer-dialog';
const CURRENT = '.slide[aria-current="true"] wfr-viewer[state="ready"]';

test('a tile click opens the viewer and mirrors the file into the URL hash', async ({ page }) => {
  await visit(page, ARCHIVE);
  const grid = page.locator('wfr-file-grid');
  await expectVisible(page, grid);
  /*
   * <wfr-file-grid> renders <wfr-file-tile> children in its shadow root; both
   * elements are Lit web components. Playwright pierces open shadow roots by
   * default, so a descendant CSS selector reaches the tiles.
   */
  await expectMinCount(page, page.locator('wfr-file-tile'), 1);
  const tiles = page.locator('wfr-file-tile');
  await tiles.first().click();

  await expectVisible(page, page.locator(DIALOG));
  await expect(page).toHaveURL(/#asset=/);
});

test('deep-link opens the named item and marks the middle slide current', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=working-notes.txt`);
  await expectVisible(page, page.locator(DIALOG));
  await expectVisible(page, page.locator(CURRENT));
  await expectText(page, page.locator('#viewer-title'), /working-notes\.txt/);
});

/*
 * The three rendering tests assert that each provider paints its output
 * into the current slide's <wfr-viewer>. `state="ready"` is a reflected
 * attribute on the viewer host; provider content lands in shadow
 * `[part="pages"] [part="page"]`, which Playwright pierces automatically.
 */
test('renders a text file inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=working-notes.txt`);
  await expectVisible(page, page.locator(CURRENT));
  await expectText(page, page.locator(`${CURRENT} [part="page"]`), /Founding documents/);
});

test('renders a pdf inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=sample-charter.pdf`);
  await expectVisible(page, page.locator(CURRENT));
  await expectMinCount(page, page.locator(`${CURRENT} [part="page"] canvas`), 1);
});

test('renders a docx inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=sample-charter.docx`);
  await expectVisible(page, page.locator(CURRENT));
  await expectText(page, page.locator(`${CURRENT} [part="page"]`), /founding document/i);
});

test('Back closes the viewer instead of leaving the page', async ({ page }) => {
  await visit(page, ARCHIVE);
  await page.locator('wfr-file-tile').first().click();
  await expectVisible(page, page.locator(DIALOG));
  await page.goBack();
  await expectHidden(page, page.locator(DIALOG));
  expect(new URL(page.url()).hash).toBe('');
});

test('ArrowRight pages the carousel and updates the URL hash', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=flag.svg`);
  await expectVisible(page, page.locator(DIALOG));
  await expectText(page, page.locator('#viewer-title'), /flag\.svg/);
  await pressKey(page, 'ArrowRight');
  await expectText(page, page.locator('#viewer-title'), /manifesto-poster\.svg/);
  await expect(page).toHaveURL(/#asset=manifesto-poster\.svg$/);
});

test('the close control closes the viewer and clears the hash in place', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=working-notes.txt`);
  await expectVisible(page, page.locator(DIALOG));
  await page.locator('#close-button').click();
  await expectHidden(page, page.locator(DIALOG));
  expect(new URL(page.url()).pathname).toBe(ARCHIVE);
  expect(new URL(page.url()).hash).toBe('');
});

test('the settings button toggles the wfr-settings-panel', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=sample-charter.pdf`);
  await expectVisible(page, page.locator(CURRENT));
  const panel = page.locator('#settings-panel');
  await expect(panel).toHaveAttribute('hidden', '');

  await page.locator('#settings-button').click();
  await expect(panel).not.toHaveAttribute('hidden');
  await expect(page.locator('#settings-button')).toHaveAttribute('aria-expanded', 'true');

  await page.locator('#settings-button').click();
  await expect(panel).toHaveAttribute('hidden', '');
  await expect(page.locator('#settings-button')).toHaveAttribute('aria-expanded', 'false');
});

/*
 * Fullscreen upgrades the DIALOG itself, not documentElement. Headless
 * Chromium rejects `HTMLDialogElement.prototype.requestFullscreen` because
 * it has no real display to fullscreen onto, so we verify the CORRECT API
 * was CALLED via a spy — the call target is the contract.
 */
test('fullscreen button tries the dialog first, falls back to documentElement', async ({
  page,
}) => {
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
  await page.locator('#fs-button').click({ force: true });
  /*
   * Fallback is async (documentElement.requestFullscreen fires from the
   * dialog.requestFullscreen rejection's .catch). Give it a beat to land.
   */
  await page.waitForTimeout(300);

  const calls = await page.evaluate(
    () => (window as unknown as { __fsCalls: { target: string; tag: string }[] }).__fsCalls,
  );
  expect(calls.length, `no requestFullscreen calls: ${JSON.stringify(calls)}`).toBeGreaterThan(0);
  /* Dialog first — always. */
  expect(calls[0]?.target, `first fs target: ${JSON.stringify(calls)}`).toBe('dialog');
  /*
   * On headless Chromium the dialog call is rejected ("Dialog elements are
   * invalid") so a documentElement fallback follows. That fallback is what
   * makes fullscreen actually engage on browsers that reject dialog
   * fullscreen — data-fs on the dialog forces its layout to fill the new
   * fullscreen viewport (guarded by *-fullscreen.pw.ts under the headed
   * project). Reference host has no fallback, so their button is a silent
   * no-op there.
   */
  expect(
    calls.some((c) => c.target === 'html'),
    `expected the documentElement fallback to fire after the dialog rejection: ${JSON.stringify(calls)}`,
  ).toBe(true);
});
