import type { SearchHit } from '@prometheus/search-core';
import type { SearchStrings } from './i18n';
import { renderHits } from './render-list';

/*
 * The results page has two modes — by words, and by meaning — and they
 * render into the same container. Keeping the drawing here means the
 * controller only decides WHICH hits to show, never how.
 */

/**
 * Draw a set of hits into the results container.
 * @param root The results container.
 * @param t Localised chrome.
 * @param hits Ranked hits, best first.
 * @param title What the list is — announced to a screen reader, since the
 * rows themselves look identical in either mode.
 */
export const renderPage = (
  root: HTMLElement,
  t: SearchStrings,
  hits: readonly SearchHit[],
  title: string,
): void => {
  if (hits.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'search-page-empty';
    empty.textContent = t.noResults;
    root.replaceChildren(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'search-page-list';
  list.setAttribute('aria-label', title);
  root.replaceChildren(list);
  renderHits(list, hits, t.sections, false);
};
