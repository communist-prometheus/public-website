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

/*
 * The browser scrolls to `location.hash` once, right after the
 * initial parse. If our annotation only put the id on the list
 * item *after* that scroll attempt, the user lands at the top of
 * the page even though the id now exists. Re-fire the scroll
 * manually when the hash matches a footnote/endnote pattern and
 * the target wasn't reachable a moment ago.
 */
const FOOTNOTE_HASH = /^#(?:footnote|endnote|fn|user-content-fn)-?\d+$/;
const LEGACY_REF_HASH = /^#(?:footnote|endnote)-ref-(\d+)$/;
const LEGACY_BODY_HASH = /^#(?:footnote|endnote|fn)-(\d+)$/;

const resolveHash = (hash: string): HTMLElement | undefined => {
  const refMatch = LEGACY_REF_HASH.exec(hash);
  if (refMatch) {
    /*
     * External shares like `#endnote-ref-19` predate the GFM
     * rename; they now have to land on `user-content-fnref-19`.
     */
    return (
      document.getElementById(`user-content-fnref-${refMatch[1]}`) ??
      document.getElementById(hash.slice(1)) ??
      undefined
    );
  }
  const bodyMatch = LEGACY_BODY_HASH.exec(hash);
  if (bodyMatch) {
    /*
     * `#endnote-19` (legacy) or `#fn19` (Pandoc) → GFM body id.
     */
    return (
      document.getElementById(`user-content-fn-${bodyMatch[1]}`) ??
      document.getElementById(hash.slice(1)) ??
      undefined
    );
  }
  return document.getElementById(hash.slice(1)) ?? undefined;
};

const restoreHashScroll = (): void => {
  const hash = globalThis.location.hash;
  if (!FOOTNOTE_HASH.test(hash) && !LEGACY_REF_HASH.test(hash)) return;
  const target = resolveHash(hash);
  if (target) target.scrollIntoView({ block: 'start' });
};

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
  restoreHashScroll();
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
