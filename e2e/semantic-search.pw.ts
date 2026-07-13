import { expect, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/*
 * Meaning search runs on a Worker, and `astro preview` serves static files
 * with no Worker behind them. So `/api/semantic` is stubbed here: what is
 * under test is the CONTRACT — the browser sends a query and nothing else,
 * gets coordinates back, and renders the article from the index it already
 * holds. The Worker's own half is exercised against the deployed dev
 * environment, where a real model and a real vector store exist.
 */

const BUTTON = '[data-testid="semantic-button"]';
const STATUS = '[data-testid="semantic-status"]';
const PAGE_HIT = '[data-testid="search-page-results"] .hit';

/* A query no article spells out — the point of meaning search. */
const QUERY = 'машины, которые думают за человека';
const RESULTS = `/ru/search?q=${encodeURIComponent(QUERY)}`;

/** The id and passage the Worker would answer with. */
const CYBER_TOOL = { doc: 'ru/blog/cyber-tool', score: 0.71, start: 0, end: 400 };

test.describe('Semantic search', () => {
  test('the button hands the query — and only the query — to the Worker', async ({ page }) => {
    const sent: unknown[] = [];
    await page.route('**/api/semantic', async (route) => {
      sent.push(JSON.parse(route.request().postData() ?? '{}'));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hits: [CYBER_TOOL] }),
      });
    });

    await visit(page, RESULTS);
    await expectVisible(page, page.locator(BUTTON));
    await page.locator(BUTTON).click();

    await expect(page.locator(PAGE_HIT)).toHaveCount(1);
    expect(sent).toEqual([{ q: QUERY, lang: 'ru' }]);
  });

  test('a hit renders from the local index — the server sent no text', async ({ page }) => {
    await page.route('**/api/semantic', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hits: [CYBER_TOOL] }),
      });
    });

    await visit(page, RESULTS);
    await page.locator(BUTTON).click();

    const hit = page.locator(PAGE_HIT).first();
    await expectVisible(page, hit);
    expect(await hit.locator('a').getAttribute('href')).toBe('/ru/blog/cyber-tool');
    expect((await hit.locator('.hit-title').textContent())?.trim()).not.toBe('');
    expect((await hit.locator('.hit-snippet').textContent())?.trim()).not.toBe('');
  });

  test('pressing again gives the word results back', async ({ page }) => {
    await page.route('**/api/semantic', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hits: [CYBER_TOOL] }),
      });
    });

    await visit(page, `/ru/search?q=${encodeURIComponent('нейросети')}`);
    await expectVisible(page, page.locator(PAGE_HIT).first());
    const exact = await page.locator(PAGE_HIT).count();
    expect(exact).toBeGreaterThan(1);

    const button = page.locator(BUTTON);
    await button.click();
    await expect(page.locator(PAGE_HIT)).toHaveCount(1);
    expect(await button.getAttribute('aria-pressed')).toBe('true');

    await button.click();
    await expect(page.locator(PAGE_HIT)).toHaveCount(exact);
    expect(await button.getAttribute('aria-pressed')).toBe('false');
  });

  /*
   * The vector store lags a deploy by a minute. An article deleted in that
   * minute must not surface: the index the browser holds is the deploy, and
   * it wins.
   */
  test('an id the index does not know is dropped, not rendered', async ({ page }) => {
    await page.route('**/api/semantic', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hits: [{ doc: 'ru/blog/deleted-yesterday', score: 0.9, start: 0, end: 100 }, CYBER_TOOL],
        }),
      });
    });

    await visit(page, RESULTS);
    await page.locator(BUTTON).click();
    await expect(page.locator(PAGE_HIT)).toHaveCount(1);
  });

  /* Rate-limited or offline: say so, and leave the word results standing. */
  test('a refusal is stated, and the exact results survive it', async ({ page }) => {
    await page.route('**/api/semantic', async (route) => {
      await route.fulfill({ status: 429, contentType: 'application/json', body: '{}' });
    });

    await visit(page, `/ru/search?q=${encodeURIComponent('нейросети')}`);
    await expectVisible(page, page.locator(PAGE_HIT).first());
    const exact = await page.locator(PAGE_HIT).count();

    await page.locator(BUTTON).click();
    await expect(page.locator(STATUS)).toHaveText('Поиск по смыслу сейчас недоступен.');
    await expect(page.locator(PAGE_HIT)).toHaveCount(exact);
  });

  /* Nothing to search by meaning means nothing to press. */
  test('no query, no button', async ({ page }) => {
    await visit(page, '/ru/search');
    await expect(page.locator(BUTTON)).toBeHidden();
  });
});
