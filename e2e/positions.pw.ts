import {
  click,
  expectMinCount,
  expectText,
  expectVisible,
  test,
  visit,
  waitForCondition,
} from '@prometheus/e2e-toolkit';

test.describe('Positions section', () => {
  test('positions listing page renders with heading', async ({ page }) => {
    await visit(page, '/en/positions');
    await expectText(page, page.locator('h1'), 'Positions');
  });

  test('positions listing shows position cards', async ({ page }) => {
    await visit(page, '/en/positions');
    await expectMinCount(page, page.locator('[data-testid="position-card"]'), 2);
  });

  test('clicking a position card navigates to detail page', async ({ page }) => {
    await visit(page, '/en/positions');
    const firstCard = page.locator('[data-testid="position-card"] a').first();
    const href = await firstCard.getAttribute('href');
    await click(page, firstCard);
    await waitForCondition(page, async () => page.url().endsWith(href ?? ''));
    await expectVisible(page, page.locator('h1'));
  });

  test('individual position page renders content', async ({ page }) => {
    await visit(page, '/en/positions/digital-sovereignty');
    await expectVisible(page, page.locator('h1'));
    await expectVisible(page, page.locator('.content'));
  });

  test('positions listing page renders in Russian', async ({ page }) => {
    await visit(page, '/ru/positions');
    await expectText(page, page.locator('h1'), 'Позиции');
    await expectMinCount(page, page.locator('[data-testid="position-card"]'), 2);
  });

  test('navigation contains Positions link', async ({ page }) => {
    await visit(page, '/en');
    const nav = page.locator('[data-testid="desktop-nav"]');
    await expectVisible(page, nav.locator('a[href="/en/positions"]'));
  });

  test('positions widget is visible on homepage', async ({ page }) => {
    await visit(page, '/en');
    const widget = page.locator('[data-testid="positions-widget"]');
    await expectVisible(page, widget);
    await expectVisible(page, widget.locator('h2'));
    await expectMinCount(page, widget.locator('[data-testid="position-card"]'), 2);
  });
});
