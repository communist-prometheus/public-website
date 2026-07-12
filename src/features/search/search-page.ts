import { prepare, search } from '@prometheus/search-core';
import { searchStrings } from './i18n';
import { renderHits } from './render-list';

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

/**
 * Render the results for `?q=` into the page.
 * @param root The container element, carrying `data-lang`.
 */
export const setupSearchPage = async (root: HTMLElement): Promise<void> => {
  const query = queryOf();
  if (query === '') return;

  const lang = root.getAttribute('data-lang') ?? 'en';
  const t = searchStrings(lang);

  /*
   * Several boxes render on this page — the header bar, the burger menu,
   * and the page's own. Seed them all: picking "the first one" quietly
   * seeds whichever happens to come first in the DOM, which is the header,
   * not the one the reader is looking at.
   */
  for (const input of document.querySelectorAll<HTMLInputElement>('[data-search-input]')) {
    input.value = query;
  }

  const res = await fetch(`/${lang}/search-index.json`);
  const hits = search(prepare(await res.json()), query, MAX_HITS);

  if (hits.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'search-page-empty';
    empty.textContent = t.noResults;
    root.replaceChildren(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'search-page-list';
  list.setAttribute('aria-label', t.resultsTitle);
  root.replaceChildren(list);
  renderHits(list, hits, t.sections, false);
};
