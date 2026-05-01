import {
  click,
  expect,
  expectHidden,
  expectText,
  expectVisible,
  pressKey,
  test,
  visit,
  waitForCondition,
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

  test('switches from EN to RU and navigates to equivalent page', async ({ page }) => {
    await visit(page, '/en/blog');
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await expectVisible(page, ruOption);
    await click(page, ruOption);
    await waitForCondition(page, async () => /\/ru\/blog\/?$/.test(page.url()));
    await expectVisible(page, page.locator('h1'));
  });

  test('switches from RU to EN and navigates to equivalent page', async ({ page }) => {
    await visit(page, '/ru/manifest');
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const enOption = switcher.locator('[data-testid="lang-option-en"]');
    await expectVisible(page, enOption);
    await click(page, enOption);
    await waitForCondition(page, async () => /\/en\/manifest\/?$/.test(page.url()));
    await expectVisible(page, page.locator('h1'));
  });

  test('preserves path segments when switching language on home page', async ({ page }) => {
    await visit(page, '/en');
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await click(page, ruOption);
    await waitForCondition(page, async () => /\/ru\/?$/.test(page.url()));
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
    await waitForCondition(page, async () => /\/en\/blog\/?$/.test(page.url()));
    const switcher = page.locator(switcherSel);
    await click(page, switcher);
    const ruOption = switcher.locator('[data-testid="lang-option-ru"]');
    await expectVisible(page, ruOption);
    await click(page, ruOption);
    await waitForCondition(page, async () => /\/ru\/blog\/?$/.test(page.url()));
  });
});
