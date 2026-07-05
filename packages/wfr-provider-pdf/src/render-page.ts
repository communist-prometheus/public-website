/**
 * Structural subsets of the pdf.js rendering API used by the helper. Declaring
 * them locally keeps {@link renderPageToCanvas} testable against a fake page —
 * the real `pdfjs-dist` types are structurally compatible with these shapes.
 *
 * The page is generic over its viewport type `V` so the value produced by
 * `getViewport` is exactly the one consumed by `render`. That lets the real
 * `PDFPageProxy` (whose viewport carries many extra fields) satisfy the shape
 * without any cast.
 */

/** The minimal dimensions every viewport must expose. */
export interface PdfViewportSize {
  readonly width: number;
  readonly height: number;
}

/** Minimal render task returned by `page.render`. */
export interface PdfRenderTask {
  readonly promise: Promise<void>;
  readonly cancel: () => void;
}

/** Minimal pdf.js page surface used during rendering, generic over its viewport. */
export interface PdfPageLike<V extends PdfViewportSize> {
  readonly getViewport: (params: { scale: number }) => V;
  readonly render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: V;
  }) => PdfRenderTask;
}

/** A function that tears down a rendered page. */
export type PageCleanup = () => void;

/**
 * Paint a pdf.js page into `container` via a freshly created `<canvas>` sized to
 * the page's viewport at `scale`. Returns a cleanup that cancels a still-pending
 * render task and clears the container.
 *
 * Rendering is best-effort: a missing 2D context (e.g. headless environments)
 * skips the paint while still appending the canvas, so the caller always gets a
 * valid cleanup.
 */
export const renderPageToCanvas = <V extends PdfViewportSize>(
  page: PdfPageLike<V>,
  scale: number,
  container: HTMLElement,
): PageCleanup => {
  const viewport = page.getViewport({ scale });
  const canvas = container.ownerDocument.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  container.appendChild(canvas);

  const task = startRender(page, canvas, viewport);

  return () => {
    task?.cancel();
    container.replaceChildren();
  };
};

/** Start the render task when a 2D context is available, otherwise skip it. */
const startRender = <V extends PdfViewportSize>(
  page: PdfPageLike<V>,
  canvas: HTMLCanvasElement,
  viewport: V,
): PdfRenderTask | undefined => {
  const canvasContext = canvas.getContext('2d');
  return canvasContext === null ? undefined : page.render({ canvasContext, viewport });
};
