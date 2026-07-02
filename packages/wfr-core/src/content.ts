/**
 * The output a provider produces for a single page of a file.
 *
 * Three render strategies are supported so providers stay free to choose the
 * cheapest correct one:
 * - `html`  — a pre-sanitized HTML string (markdown, csv table, …).
 * - `node`  — a ready DOM node (e.g. an `<img>` or `<canvas>`).
 * - `mount` — imperative mount into a host-provided container, returning an
 *             optional cleanup (used by streaming/canvas renderers like pdf.js).
 */
export type PageContent =
  | { readonly kind: 'html'; readonly html: string }
  | { readonly kind: 'node'; readonly node: Node }
  | { readonly kind: 'mount'; readonly mount: PageMount };

/** Imperative renderer: paint into `container`, optionally return a cleanup. */
export type PageMount = (container: HTMLElement) => void | (() => void);

/** A single page of viewer output. */
export interface ViewerPage {
  /** Unique within the content (used as a stable key and scroll anchor). */
  readonly id: string;
  /** The renderable content for this page. */
  readonly content: PageContent;
  /** Optional human-readable label (e.g. `Page 3`). */
  readonly label?: string;
}

/**
 * Viewer output. A provider decides — based on the file and user settings —
 * whether to emit a single page or many. Both render into a scrollable surface.
 */
export type ViewerContent =
  | { readonly kind: 'single'; readonly page: ViewerPage }
  | { readonly kind: 'multi'; readonly pages: readonly ViewerPage[] };

/** Normalize any viewer content to a flat, ordered list of pages. */
export const contentPages = (content: ViewerContent): readonly ViewerPage[] => {
  switch (content.kind) {
    case 'single':
      return [content.page];
    case 'multi':
      return content.pages;
  }
};

/** Number of pages in the content. */
export const pageCount = (content: ViewerContent): number => contentPages(content).length;
