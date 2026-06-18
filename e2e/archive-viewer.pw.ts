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

test('renders a text file inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=working-notes.txt`);
  await expectVisible(page, page.locator('.archive-viewer-doc pre.archive-doc-text'));
  await expectText(page, page.locator('.archive-doc-text'), /Founding documents/);
});

test('renders a pdf inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=sample-charter.pdf`);
  await expectVisible(page, page.locator('iframe.archive-doc-frame'));
});

test('renders a docx inline', async ({ page }) => {
  await visit(page, `${ARCHIVE}#asset=sample-charter.docx`);
  await expectText(page, page.locator('.archive-doc-docx'), /founding document/i);
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
