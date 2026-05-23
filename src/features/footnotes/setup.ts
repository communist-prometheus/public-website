import { annotateLegacyList, findLegacyRefs } from './legacy';
import { transformFootnoteRef } from './transform';

const GFM_REF = 'a[data-footnote-ref]';
const PROCESSED_FLAG = 'data-footnote-enhanced';

const supportsPopover = (): boolean =>
  typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

const targetOf = (anchor: HTMLAnchorElement): Element | undefined => {
  const href = anchor.getAttribute('href') ?? '';
  const id = href.startsWith('#') ? href.slice(1) : '';
  if (id === '') return undefined;
  return document.getElementById(id) ?? undefined;
};

const pageLang = (): string => document.documentElement.lang || 'en';

const enhanceOne = (anchor: HTMLAnchorElement, li: Element, lang: string): void => {
  transformFootnoteRef({ anchor, footnoteLi: li, lang });
};

const enhanceGfm = (lang: string): void => {
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(GFM_REF)) {
    const li = targetOf(anchor);
    if (li) enhanceOne(anchor, li, lang);
  }
};

const enhanceLegacy = (lang: string): void => {
  for (const { anchor, li } of findLegacyRefs()) enhanceOne(anchor, li, lang);
};

/**
 * Enhance every footnote reference on the page into a popover
 * trigger and (re-)attach `id`s to legacy footnote lists so direct
 * `#endnote-N` deep-links resolve. Idempotent — subsequent runs
 * skip already-processed bodies via a marker attribute.
 *
 * The annotation step (giving the bottom `<li>`s their ids) does
 * not need the Popover API; it runs unconditionally so old browsers
 * still get one direction of navigation working.
 */
export const enhanceFootnotes = (): void => {
  if (document.body.hasAttribute(PROCESSED_FLAG)) return;
  document.body.setAttribute(PROCESSED_FLAG, '');
  annotateLegacyList();
  if (!supportsPopover()) return;
  const lang = pageLang();
  enhanceGfm(lang);
  enhanceLegacy(lang);
};

/**
 * Clear the per-page processed flag so the next page-load can
 * enhance again. Wired to `astro:before-swap` because ClientRouter
 * preserves `<body>` across navigations.
 */
export const resetFootnotes = (): void => {
  document.body.removeAttribute(PROCESSED_FLAG);
};
