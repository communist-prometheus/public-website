import type { SearchIndex } from '@prometheus/search-core';
import { prepare, search } from '@prometheus/search-core';
import { searchStrings } from './i18n';
import { renderPage } from './page-view';
import { setupSemanticToggle } from './semantic-toggle';

/*
 * The results page renders from the same index the dropdown uses.
 *
 * With no `?q=` it fetches NOTHING. That is not just an optimisation: the
 * Lighthouse gate (100 across the board) audits `/en/search` as an
 * ordinary page, and an index download it never needed would be counted
 * against it. It is also the honest behaviour — an empty search box is
 * not a request to download the site.
 */

const MAX_HITS = 40;

const queryOf = (): string => new URL(globalThis.location.href).searchParams.get('q')?.trim() ?? '';

/*
 * Several boxes render on this page — the header bar, the burger menu,
 * and the page's own. Seed them all: picking "the first one" quietly
 * seeds whichever happens to come first in the DOM, which is the header,
 * not the one the reader is looking at.
 */
const seedBoxes = (query: string): void => {
  for (const input of document.querySelectorAll<HTMLInputElement>('[data-search-input]')) {
    input.value = query;
  }
};

const pick = <T extends HTMLElement>(selector: string): T | undefined =>
  document.querySelector<T>(selector) ?? undefined;

/**
 * Render the results for `?q=` into the page, and arm the meaning search.
 * @param root The container element, carrying `data-lang`.
 */
export const setupSearchPage = async (root: HTMLElement): Promise<void> => {
  const query = queryOf();
  if (query === '') return;

  const lang = root.getAttribute('data-lang') ?? 'en';
  const t = searchStrings(lang);
  seedBoxes(query);

  const res = await fetch(`/${lang}/search-index.json`);
  const index = (await res.json()) as SearchIndex;
  const exact = search(prepare(index), query, MAX_HITS);
  renderPage(root, t, exact, t.exactTitle);

  const button = pick<HTMLButtonElement>('[data-semantic]');
  const status = pick('[data-semantic-status]');
  if (button === undefined || status === undefined) return;
  setupSemanticToggle(button, {
    root,
    status,
    t,
    lang,
    query,
    docs: index.docs,
    exact,
  });
};
