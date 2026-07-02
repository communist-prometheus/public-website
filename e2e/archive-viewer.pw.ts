import {
  expect,
  expectAttribute,
  expectHidden,
  expectMinCount,
  expectText,
  expectVisible,
  pressKey,
  test,
  visit,
} from '@prometheus/e2e-toolkit';

/**
 * Archive viewer E2E.
 *
 * Covers the inline reader (text/pdf/docx render in the modal, not just
 * download), URL-driven state (`#asset=<name>` deep-links + Back closes),
 * keyboard navigation, and the regression that the prev/next arrows must
 * stay focusable and reappear on focus instead of being `disabled` away.
 *
 * Relies on the seeded `founding-documents` album (5 assets: flag.svg,
 * manifesto-poster.svg, sample-charter.docx, sample-charter.pdf,
 * working-notes.txt — sorted by name).
 */

const ARCHIVE = '/en/archive/founding-documents/';
const DIALOG = 'dialog.archive-viewer';

const tile = (name: string): string => `[data-archive-item][data-name="${name}"]`;

test('opens the viewer from a tile and mirrors the item into the URL', async ({ page }) => {
  await visit(page, ARCHIVE);
  await expectMinCount(page, page.locator('[data-archive-item]'), 1);
  await page.locator(tile('working-notes.txt')).click();
  await expectVisible(page, page.locator(DIALOG));
  await expect(page).toHaveURL(/#asset=working-notes\.txt$/);
});

/*
 * The three rendering tests assert that a document opens inside the shared
 * <wfr-viewer> element via its lazy provider. The dialog holds a 3-slide
 * carousel (prev / current / next), so we scope selectors to the current
 * slide via `[aria-current="true"]`. `state="ready"` is a reflected
 * attribute on the viewer host, and Playwright's default engines pierce
 * open shadow roots — so descendant selectors reach the provider-painted
 * [part="page"] subtree without a special combinator.
 */
const CURRENT = '.archive-viewer-slide[aria-current="true"] wfr-viewer[state="ready"]';

test('renders a text file inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=working-notes.txt`);
  await expectVisible(page, page.locator(CURRENT));
  await expectText(page, page.locator(`${CURRENT} [part="page"]`), /Founding documents/);
});

test('renders a pdf inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=sample-charter.pdf`);
  await expectVisible(page, page.locator(CURRENT));
  // provider-pdf uses pdf.js which paints each page onto a <canvas>.
  await expectMinCount(page, page.locator(`${CURRENT} [part="page"] canvas`), 1);
});

test('renders a docx inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=sample-charter.docx`);
  await expectVisible(page, page.locator(CURRENT));
  await expectText(page, page.locator(`${CURRENT} [part="page"]`), /founding document/i);
});

test('a deep-link opens the named item on first load', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=sample-charter.pdf`);
  await expectVisible(page, page.locator(DIALOG));
  await expectText(page, page.locator('.archive-viewer-counter'), '4 / 5');
});

test('Back closes the viewer instead of leaving the page', async ({ page }) => {
  await visit(page, ARCHIVE);
  await page.locator(tile('working-notes.txt')).click();
  await expectVisible(page, page.locator(DIALOG));
  await page.goBack();
  await expectHidden(page, page.locator(DIALOG));
  expect(new URL(page.url()).hash).toBe('');
});

test('arrow keys navigate and update hash + counter', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=flag.svg`);
  await expectVisible(page, page.locator(DIALOG));
  await expectText(page, page.locator('.archive-viewer-counter'), '1 / 5');
  await pressKey(page, 'ArrowRight');
  await expectText(page, page.locator('.archive-viewer-counter'), '2 / 5');
  await expect(page).toHaveURL(/#asset=manifesto-poster\.svg$/);
});

test('nav arrows stay focusable and reappear on focus (not disabled away)', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=flag.svg`);
  const next = page.locator('.archive-viewer-next');
  const prev = page.locator('.archive-viewer-prev');
  /*
   * never removed from the DOM, never a `disabled` button (which the
   * original bug used — it dropped the arrow out of the tab order)
   */
  await expect(next).toBeAttached();
  await expect(next).not.toBeDisabled();
  // hidden until focus on a hover-capable pointer, then revealed on focus
  await expect(next).toHaveCSS('opacity', '0');
  await next.focus();
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS('opacity', '1');
  /*
   * the no-neighbour direction is aria-disabled (announced to AT) but
   * STILL in the tab order — focus must land on it and reveal it
   */
  await expectAttribute(page, prev, 'aria-disabled', 'true');
  await prev.focus();
  await expect(prev).toBeFocused();
  await expect(prev).toHaveCSS('opacity', '0.3');
});

test('the close control closes the viewer and clears the hash in place', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=working-notes.txt`);
  await expectVisible(page, page.locator(DIALOG));
  await page.locator('.archive-viewer-close').click();
  await expectHidden(page, page.locator(DIALOG));
  expect(new URL(page.url()).pathname).toBe(ARCHIVE);
  expect(new URL(page.url()).hash).toBe('');
});

/*
 * Chrome auto-hide + tap-to-toggle. The dialog carries a `data-chrome-hidden`
 * attribute the CSS keys off; the bar fades to opacity 0 when the attribute
 * is present. A click on the file surface toggles it; any pointermove pokes
 * it back to visible.
 */
/*
 * Chrome UX contract:
 *   - visible on open, then auto-hides after ~2.5 s
 *   - clicking the file surface toggles (touch tap uses the same event
 *     path, so mobile taps are covered by these assertions)
 *   - any pointermove pokes it back to visible
 *
 * On desktop, `mouse.click(x, y)` first moves the mouse to (x, y) which
 * dispatches pointermove and pokes chrome to visible before the click
 * lands — so the click always resolves to "hidden". We dispatch bare
 * click events via `dispatchEvent` to isolate the click path from the
 * pointermove-along-the-way effect that only exists in the test harness.
 */
test('a click on the file surface toggles chrome visibility (touch/tap parity)', async ({
  page,
}) => {
  await visit(page, `${ARCHIVE}#asset=working-notes.txt`);
  const dialog = page.locator(DIALOG);
  await expectVisible(page, dialog);
  await expect(dialog).not.toHaveAttribute('data-chrome-hidden');

  const slide = page.locator('.archive-viewer-slide[aria-current="true"]');
  // First tap: hide.
  await slide.dispatchEvent('click');
  await expect(dialog).toHaveAttribute('data-chrome-hidden', '');
  // Second tap without any pointermove in between: show.
  await slide.dispatchEvent('click');
  await expect(dialog).not.toHaveAttribute('data-chrome-hidden');
});

test('pointermove pokes chrome back to visible after a hidden state', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=working-notes.txt`);
  const dialog = page.locator(DIALOG);
  await expectVisible(page, dialog);

  const slide = page.locator('.archive-viewer-slide[aria-current="true"]');
  await slide.dispatchEvent('click');
  await expect(dialog).toHaveAttribute('data-chrome-hidden', '');

  // Any pointermove on the dialog un-hides — simulate via a bare event so
  // we don't rely on Playwright's mouse.move sending events that already
  // toggle chrome from the click path.
  await slide.dispatchEvent('pointermove');
  await expect(dialog).not.toHaveAttribute('data-chrome-hidden');
});

/*
 * Fullscreen upgrades the DIALOG itself, not the documentElement. The
 * regression the user reported was that fullscreen went onto <html> and
 * the dialog stayed anchored to the pre-fullscreen viewport rectangle,
 * so the archive page around the dialog was visible during fullscreen.
 *
 * Headless Chromium rejects `HTMLDialogElement.prototype.requestFullscreen`
 * because it has no real display to fullscreen onto, so `fullscreenElement`
 * stays null even for correct code. We therefore verify that the CORRECT
 * API was CALLED via an addInitScript spy — the call itself is the contract.
 */
test('fullscreen button calls requestFullscreen on the dialog (not documentElement)', async ({
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

  await page.locator('.archive-viewer-fullscreen').click({ force: true });

  const calls = await page.evaluate(
    () => (window as unknown as { __fsCalls: { target: string; tag: string }[] }).__fsCalls,
  );
  expect(
    calls.length,
    `no requestFullscreen calls at all: ${JSON.stringify(calls)}`,
  ).toBeGreaterThan(0);
  expect(calls[0]?.target, `first fs call: ${JSON.stringify(calls)}`).toBe('dialog');
  // Guard against the removed documentElement fallback being re-added.
  expect(
    calls.some((c) => c.target === 'html'),
    `documentElement fallback re-appeared: ${JSON.stringify(calls)}`,
  ).toBe(false);
});

/*
 * When fullscreen actually engages, the button reflects the state via
 * aria-pressed / aria-label. Simulate that state via a manual dispatch
 * because headless can't reach it via the real API.
 */
test('the fullscreen button reflects fullscreenchange in its aria-pressed / label', async ({
  page,
}) => {
  await visit(page, `${ARCHIVE}#asset=flag.svg`);
  await expectVisible(page, page.locator(DIALOG));

  const btn = page.locator('.archive-viewer-fullscreen');
  await expect(btn).toHaveAttribute('aria-label', 'Toggle fullscreen');

  // Pretend fullscreen entered. The wired listener only reads
  // document.fullscreenElement, so we shadow it long enough to dispatch.
  await page.evaluate(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => document.querySelector('dialog.archive-viewer'),
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(btn).toHaveAttribute('aria-label', 'Exit fullscreen');

  await page.evaluate(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await expect(btn).toHaveAttribute('aria-label', 'Toggle fullscreen');
});
