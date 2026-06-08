import {
  click,
  expect,
  expectHidden,
  expectText,
  expectVisible,
  pressKey,
  test,
  visit,
  waitForUrl,
} from '@prometheus/e2e-toolkit';

const desktopNav = '[data-testid="desktop-nav"]';

test.describe('Language switcher - Desktop', () => {
  const switcherSel = 'header .desktop-only [data-testid="language-switcher"]';

  test('switcher is visible in header', async ({ page }) => {
    await visit(page, '/en');
    await expectVisible(page, page.locator(switcherSel));
  });

  test('shows current language label', async ({ page }) => {
    await visit(page, '/en');
    await expectText(page, page.locator(switcherSel), 'EN');
  });

  /*
   * Ticket #20: the Ukrainian route code is `uk` (ISO 639-1), which
   * uppercases to "UK" — the United Kingdom country code. Editors
   * asked for the abbreviation "UKR" instead. The trigger must show
   * UKR, not UK, on /uk.
   */
  test('shows UKR (not UK) as the abbreviation on the Ukrainian page', async ({ page }) => {
    await visit(page, '/uk');
    const trigger = page.locator(`${switcherSel} .lang-current`);
    await expectText(page, trigger, 'UKR');
  });

  test('switches from EN to RU and navigates to equivalent page', async ({ page }) => {
    await visit(page, '/en/blog');
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await expectVisible(page, ruOption);
    await click(page, ruOption);
    await waitForUrl(page, /\/ru\/blog\/?$/);
    await expectVisible(page, page.locator('h1'));
  });

  test('switches from RU to EN and navigates to equivalent page', async ({ page }) => {
    await visit(page, '/ru/manifest');
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const enOption = switcher.locator('[data-testid="lang-option-en"]');
    await expectVisible(page, enOption);
    await click(page, enOption);
    await waitForUrl(page, /\/en\/manifest\/?$/);
    await expectVisible(page, page.locator('h1'));
  });

  test('preserves path segments when switching language on home page', async ({ page }) => {
    await visit(page, '/en');
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await click(page, ruOption);
    await waitForUrl(page, /\/ru\/?$/);
    await expect(page).toHaveURL(/\/ru\/?$/);
  });

  test('dropdown closes when clicking outside', async ({ page }) => {
    await visit(page, '/en');
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const dropdown = switcher.locator('[data-testid="language-dropdown"]');
    await expectVisible(page, dropdown);
    await click(page, page.locator('h1'));
    await expectHidden(page, dropdown);
  });

  test('is keyboard navigable', async ({ page }) => {
    await visit(page, '/en');
    const trigger = page.locator(`${switcherSel} .lang-trigger`);
    await trigger.focus();
    await pressKey(page, 'Enter');
    const dropdown = page.locator(`${switcherSel} [data-testid="language-dropdown"]`);
    await expectVisible(page, dropdown);
    await pressKey(page, 'Escape');
    await expectHidden(page, dropdown);
  });

  test('works after SPA navigation', async ({ page }) => {
    await visit(page, '/en');
    await click(page, page.locator(`${desktopNav} a[href="/en/blog"]`));
    await waitForUrl(page, /\/en\/blog\/?$/);
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await expectVisible(page, ruOption);
    await click(page, ruOption);
    await waitForUrl(page, /\/ru\/blog\/?$/);
  });
});
