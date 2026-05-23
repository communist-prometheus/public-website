import { transformFootnoteRef } from './transform';

const REF_SELECTOR = 'a[data-footnote-ref]';
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

/**
 * Enhance every GFM footnote reference on the page into a popover
 * trigger. Idempotent — re-runs (e.g. on `astro:page-load`) skip
 * already-processed nodes via a marker attribute on `<body>`.
 *
 * No-op in browsers without the HTML Popover API: the original
 * `<a href="#user-content-fn-N">` keeps working as a plain link.
 */
export const enhanceFootnotes = (): void => {
  if (!supportsPopover()) return;
  if (document.body.hasAttribute(PROCESSED_FLAG)) return;
  document.body.setAttribute(PROCESSED_FLAG, '');
  const lang = pageLang();
  const anchors = document.querySelectorAll<HTMLAnchorElement>(REF_SELECTOR);
  for (const anchor of anchors) {
    const footnoteLi = targetOf(anchor);
    if (!footnoteLi) continue;
    transformFootnoteRef({ anchor, footnoteLi, lang });
  }
};

/**
 * Clear the per-page processed flag so the next page-load can
 * enhance again. Wired to `astro:before-swap` because ClientRouter
 * preserves `<body>` across navigations.
 */
export const resetFootnotes = (): void => {
  document.body.removeAttribute(PROCESSED_FLAG);
};
