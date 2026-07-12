import { expect, expectVisible, test, visit } from '@prometheus/e2e-toolkit';

/*
 * The site had no search, so finding the articles about AI meant grepping
 * the content repo. These assertions are that story, turned into a gate:
 * a reader who half-remembers a word — and misspells it — has to land on
 * the right article.
 */

/*
 * Several search boxes render on one page — the header bar, the burger
 * menu, and (on the results page) the wide one. Every selector below is
 * scoped to ONE of them; an unscoped `.hit` would match whichever the DOM
 * happened to put first.
 *
 * The home page carries no box of its own: the header and the burger menu
 * already reach it from every page, including that one.
 */
const HEADER = '[data-testid="search-header"]';
const HERO = '[data-testid="search-hero"]';
const HEADER_INPUT = `${HEADER} [data-search-input]`;
const HERO_INPUT = `${HERO} [data-search-input]`;
const HEADER_HIT = `${HEADER} .hit`;
const PAGE_HIT = '[data-testid="search-page-results"] .hit';

/* Both terms misspelled, exactly as a hurried reader would type them. */
const TYPO_QUERY = 'искуственный интелект';

test.describe('Content search', () => {
  test('the header box finds an article by a word in its body', async ({ page }) => {
    await visit(page, '/ru/blog');
    await page.locator(HEADER_INPUT).fill('нейросети');
    await expectVisible(page, page.locator(HEADER_HIT).first());

    const links = await page
      .locator(`${HEADER_HIT} a`)
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')));
    expect(links).toContain('/ru/blog/cyber-tool');
  });

  test('a misspelled query still reaches the article', async ({ page }) => {
    await visit(page, '/ru');
    await page.locator(HEADER_INPUT).fill(TYPO_QUERY);
    await expectVisible(page, page.locator(HEADER_HIT).first());

    const links = await page
      .locator(`${HEADER_HIT} a`)
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')));
    expect(links).toContain('/ru/blog/cyber-tool');
    expect(links).toContain('/ru/blog/international-review-april-2026');
  });

  /*
   * The highlight has to cover the word the reader meant — see the offset
   * map in search-core: the fold does not preserve character positions.
   */
  test('the snippet marks the word the reader meant, spelled as the article spells it', async ({
    page,
  }) => {
    await visit(page, '/ru');
    await page.locator(HEADER_INPUT).fill('нейросети');
    await expectVisible(page, page.locator(`${HEADER_HIT} mark`).first());
    const marked = await page.locator(`${HEADER_HIT} mark`).first().textContent();
    expect(marked?.toLowerCase()).toContain('нейросет');
  });

  test('keyboard drives the dropdown', async ({ page }) => {
    await visit(page, '/ru/blog');
    const input = page.locator(HEADER_INPUT);
    await input.fill('нейросети');
    await expectVisible(page, page.locator(HEADER_HIT).first());

    await input.press('ArrowDown');
    await expect(page.locator(`${HEADER} [aria-selected="true"]`)).toHaveCount(1);
    expect(await input.getAttribute('aria-activedescendant')).toBe('search-hit-0');

    await input.press('Escape');
    expect(await input.getAttribute('aria-expanded')).toBe('false');
  });

  test('Enter with nothing selected lands on the results page', async ({ page }) => {
    await visit(page, '/ru/blog');
    await page.locator(HEADER_INPUT).fill('нейросети');
    await page.locator(HEADER_INPUT).press('Enter');
    await page.waitForURL(/\/ru\/search\?q=/);
    await expectVisible(page, page.locator(PAGE_HIT).first());
  });

  test('the results page is addressable — a search can be sent to someone', async ({ page }) => {
    await visit(page, `/ru/search?q=${encodeURIComponent(TYPO_QUERY)}`);
    await expectVisible(page, page.locator(PAGE_HIT).first());

    /* The box shows what was searched for, so the reader can refine it. */
    expect(await page.locator(HERO_INPUT).inputValue()).toBe(TYPO_QUERY);

    const links = await page
      .locator(`${PAGE_HIT} a`)
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')));
    expect(links).toContain('/ru/blog/cyber-tool');
  });

  test('a query that matches nothing says so', async ({ page }) => {
    await visit(page, '/ru');
    await page.locator(HEADER_INPUT).fill('квазипсевдонечто');
    await expectVisible(page, page.locator(`${HEADER} [data-testid="search-empty"]`));
    await expect(page.locator(HEADER_HIT)).toHaveCount(0);
  });

  /* The box is a real GET form, so it works before — and without — JS. */
  test('the box is a form that points at the results page', async ({ page }) => {
    await visit(page, '/ru');
    const form = page.locator(HEADER);
    expect(await form.getAttribute('action')).toBe('/ru/search');
    expect(await form.getAttribute('method')).toBe('get');
  });

  /*
   * It is reachable from the header and the burger menu on every page —
   * including this one — so a third box on the home page is noise.
   */
  test('the home page carries no box of its own', async ({ page }) => {
    await visit(page, '/ru');
    await expect(page.locator(HERO)).toHaveCount(0);
    await expectVisible(page, page.locator(HEADER_INPUT));
  });

  test('search reaches every section, not only the blog', async ({ page }) => {
    await visit(page, '/ru');
    await page.locator(HEADER_INPUT).fill('прометей');
    await expectVisible(page, page.locator(HEADER_HIT).first());

    const sections = await page
      .locator(`${HEADER_HIT} .hit-section`)
      .evaluateAll((nodes) => nodes.map((n) => n.textContent));
    expect(sections.some((s) => s !== 'Блог')).toBe(true);
  });
});
