import type { SearchHit, SearchSection } from '@prometheus/search-core';
import { snippetParts } from './render-hit';

/*
 * Every string that came from content is written with `textContent`, and
 * the highlight is built by splitting on the scorer's character ranges.
 * Nothing here concatenates HTML, so a body carrying `<img onerror=…>`
 * lands in the page as characters — the way the reader wrote them.
 */

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  return node;
};

const snippetOf = (hit: SearchHit): HTMLParagraphElement => {
  const p = el('p', 'hit-snippet');
  for (const part of snippetParts(hit)) {
    const node = part.marked ? el('mark', 'hit-mark') : document.createTextNode('');
    node.textContent = part.text;
    p.append(node);
  }
  return p;
};

const rowOf = (
  hit: SearchHit,
  at: number,
  sections: Readonly<Record<SearchSection, string>>,
  asOption: boolean,
): HTMLLIElement => {
  const li = el('li', 'hit');
  /*
   * `role="option"` is only meaningful inside a listbox. The dropdown is
   * one; the results page is a plain list of links, and claiming the role
   * there would lie to a screen reader about what it can do.
   */
  if (asOption) {
    li.id = `search-hit-${at}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
  }

  const link = el('a', 'hit-link');
  link.href = hit.doc.url;

  const section = el('span', 'hit-section');
  section.textContent = sections[hit.doc.section];

  const title = el('span', 'hit-title');
  title.textContent = hit.doc.title;

  link.append(section, title, snippetOf(hit));
  li.append(link);
  return li;
};

/**
 * Replace a list's contents with the given hits.
 * @param list The `<ul>` to fill.
 * @param hits Ranked hits.
 * @param sections Localised section labels.
 * @param asOptions Whether the list is a combobox listbox (the dropdown)
 * rather than a plain list of links (the results page).
 */
export const renderHits = (
  list: HTMLElement,
  hits: readonly SearchHit[],
  sections: Readonly<Record<SearchSection, string>>,
  asOptions = true,
): void => {
  list.replaceChildren(...hits.map((hit, at) => rowOf(hit, at, sections, asOptions)));
};
