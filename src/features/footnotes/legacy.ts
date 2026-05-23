/*
 * Articles imported by an older admin pipeline carry a manual
 * footnote section (a trailing `<ol>` whose `<li>`s end with an
 * `↑` back-link pointing at `#footnote-ref-N` or `#endnote-ref-N`)
 * instead of the GFM `<section data-footnotes>` shape.
 *
 * This module:
 *  - locates that legacy list and gives each `<li>` an `id` so
 *    direct deep-links of the form `#endnote-19` start scrolling
 *    to the right footnote body;
 *  - collects inline markers in three legacy shapes — Pandoc
 *    HTML5 (`role="doc-noteref"`), and bare `<sup><a href="#fn…">`
 *    or `<sup><a href="#endnote-…">` — and pairs each with its
 *    target `<li>` for the popover enhancer to consume.
 *
 * If the body lost its inline markers entirely (an older import
 * bug now fixed in the admin), the second step yields nothing and
 * only the `id` annotation helps — but at least one direction of
 * navigation starts working.
 */

const BACKREF_HREF = /^#(?:footnote|endnote)-ref-(\d+)$/;

/** Pair of an inline footnote ref and the `<li>` that holds its body. */
export interface LegacyRef {
  readonly anchor: HTMLAnchorElement;
  readonly li: Element;
}

const findLegacyList = (): HTMLOListElement | undefined => {
  for (const ol of document.querySelectorAll<HTMLOListElement>('ol')) {
    const items = [...ol.querySelectorAll(':scope > li')];
    if (items.length === 0) continue;
    const looksLikeFootnotes = items.every((li) =>
      [...li.querySelectorAll('a[href]')].some((a) =>
        BACKREF_HREF.test(a.getAttribute('href') ?? ''),
      ),
    );
    if (looksLikeFootnotes) return ol;
  }
  return undefined;
};

const annotateOne = (li: Element): string | undefined => {
  const backref = li.querySelector<HTMLAnchorElement>(
    'a[href^="#footnote-ref-"], a[href^="#endnote-ref-"]',
  );
  const m = BACKREF_HREF.exec(backref?.getAttribute('href') ?? '');
  if (!m) return undefined;
  const n = m[1];
  if (n === undefined) return undefined;
  if (!li.id) li.id = `endnote-${n}`;
  return n;
};

/**
 * Locate the article's legacy footnote list (if any) and give each
 * `<li>` an `id` so deep-links like `#endnote-19` resolve. Returns
 * the discovered list — callers can use it for further wiring.
 * @returns The annotated list element, or undefined when none found.
 */
export const annotateLegacyList = (): HTMLOListElement | undefined => {
  const ol = findLegacyList();
  if (!ol) return undefined;
  for (const li of ol.querySelectorAll(':scope > li')) annotateOne(li);
  return ol;
};

/**
 * Inline references that lack the GFM `data-footnote-ref` attribute
 * but still point to a footnote body — Pandoc HTML5 noteref links
 * or bare `<sup>` anchors. Already-resolved (anchor, body) pairs are
 * returned in document order.
 * @returns Resolved legacy ref pairs ready for the popover transformer.
 */
export const findLegacyRefs = (): readonly LegacyRef[] => {
  const sel =
    'a[role="doc-noteref"], sup > a[href^="#footnote-"], sup > a[href^="#endnote-"], sup > a[href^="#fn"]';
  const out: LegacyRef[] = [];
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(sel)) {
    const href = anchor.getAttribute('href') ?? '';
    if (!href.startsWith('#') || href.includes('-ref-')) continue;
    const li = document.getElementById(href.slice(1));
    if (li) out.push({ anchor, li });
  }
  return out;
};
