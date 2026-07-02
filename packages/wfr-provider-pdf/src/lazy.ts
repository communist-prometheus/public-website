import type {
  FileDescriptor,
  PageMount,
  ProviderModule,
  ProviderSettings,
  SettingsSchema,
  ViewerContent,
  ViewerPage,
} from '@web-file-reader/core';
import { defaultsFromSchema } from '@web-file-reader/core';
import { readBytes } from './read-bytes';
import { renderPageToCanvas } from './render-page';

/** Declarative settings exposed in the viewer's settings panel. */
export const settingsSchema: SettingsSchema = [
  { kind: 'number', key: 'scale', label: 'Scale', default: 1.2, min: 0.5, max: 4, step: 0.1 },
  {
    kind: 'select',
    key: 'pageMode',
    label: 'Pages',
    default: 'all',
    options: [
      { value: 'all', label: 'All pages' },
      { value: 'single', label: 'First page only' },
    ],
  },
];

/** Complete defaults derived from {@link settingsSchema}. */
export const defaultSettings: ProviderSettings = defaultsFromSchema(settingsSchema);

/**
 * The `pdfjs-dist` module type, taken in a pure type position so no static
 * runtime import is emitted (the descriptor's lazy load is what pulls pdf.js in).
 */
type PdfModule = typeof import('pdfjs-dist');

/** The resolved pdf.js document type. */
type PdfDocument = Awaited<ReturnType<PdfModule['getDocument']>['promise']>;

/** Read a number setting, falling back to a default when absent/mistyped. */
const readNumber = (settings: ProviderSettings, key: string, fallback: number): number => {
  const value = settings[key];
  return typeof value === 'number' ? value : fallback;
};

/** Read a string setting, falling back to a default when absent/mistyped. */
const readString = (settings: ProviderSettings, key: string, fallback: string): string => {
  const value = settings[key];
  return typeof value === 'string' ? value : fallback;
};

/** Lazily import pdf.js and configure its worker exactly once. */
const loadPdfjs = async (): Promise<PdfModule> => {
  const pdfjs: PdfModule = await import('pdfjs-dist');
  configureWorker(pdfjs);
  return pdfjs;
};

/** Set the worker source a single time; guarded so re-renders never reset it. */
const configureWorker = (pdfjs: PdfModule): void => {
  switch (pdfjs.GlobalWorkerOptions.workerSrc === '') {
    case true:
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).href;
      return;
    default:
      return;
  }
};

/** Build the imperative mount that paints one pdf page into a container. */
const createPageMount = (doc: PdfDocument, pageNumber: number, scale: number): PageMount => (
  container,
) => {
  let cleanup = (): void => container.replaceChildren();
  void doc.getPage(pageNumber).then((page) => {
    cleanup = renderPageToCanvas(page, scale, container);
  });
  return () => cleanup();
};

/** Build a single viewer page descriptor for the given pdf page number. */
const toViewerPage = (doc: PdfDocument, pageNumber: number, scale: number): ViewerPage => ({
  id: `page-${pageNumber}`,
  label: `Page ${pageNumber}`,
  content: { kind: 'mount', mount: createPageMount(doc, pageNumber, scale) },
});

/** Single-page content rendering only the first pdf page. */
const toSingleContent = (doc: PdfDocument, scale: number): ViewerContent => ({
  kind: 'single',
  page: toViewerPage(doc, 1, scale),
});

/** Multi-page content rendering every pdf page in order. */
const toMultiContent = (doc: PdfDocument, scale: number): ViewerContent => ({
  kind: 'multi',
  pages: Array.from({ length: doc.numPages }, (_unused, index) =>
    toViewerPage(doc, index + 1, scale),
  ),
});

/** Resolve viewer content for a pdf file according to the user's settings. */
const render = async (
  file: FileDescriptor,
  settings: ProviderSettings,
): Promise<ViewerContent> => {
  const scale = readNumber(settings, 'scale', 1.2);
  const pageMode = readString(settings, 'pageMode', 'all');
  const pdfjs = await loadPdfjs();
  const data = await readBytes(file.source);
  const doc = await pdfjs.getDocument({ data }).promise;
  return pageMode === 'single' ? toSingleContent(doc, scale) : toMultiContent(doc, scale);
};

/** Heavy provider module — pulled in only behind the descriptor's lazy load. */
export const module: ProviderModule = { settingsSchema, defaultSettings, render };
