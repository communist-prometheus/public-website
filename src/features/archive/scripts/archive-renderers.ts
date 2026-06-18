/*
 * Lazy-loaded per-type renderers for the archive viewer. This module is
 * imported as its own chunk only on a page that has an archive gallery,
 * and the heavy docx engine is imported on demand inside `renderDocx`,
 * so neither weighs on pages without archive content. Each renderer
 * fills the passed container; the caller owns the spinner + fallback.
 */

/** Document kinds the viewer renders inline (beyond plain images). */
export type DocKind = 'text' | 'pdf' | 'docx';

const fetchOk = async (url: string): Promise<Response> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
};

const renderText = async (url: string, container: HTMLElement): Promise<void> => {
  const text = await (await fetchOk(url)).text();
  const pre = document.createElement('pre');
  pre.className = 'archive-doc-text';
  pre.textContent = text;
  container.replaceChildren(pre);
};

const renderPdf = (url: string, name: string, container: HTMLElement): void => {
  const frame = document.createElement('iframe');
  frame.className = 'archive-doc-frame';
  frame.src = url;
  frame.title = name;
  container.replaceChildren(frame);
};

const renderDocx = async (url: string, container: HTMLElement): Promise<void> => {
  const [{ renderAsync }, res] = await Promise.all([import('docx-preview'), fetchOk(url)]);
  const blob = await res.blob();
  const page = document.createElement('div');
  page.className = 'archive-doc-docx';
  container.replaceChildren(page);
  await renderAsync(blob, page, undefined, { inWrapper: true, ignoreWidth: true });
};

/**
 * Render a document of the given kind into `container`.
 * @param kind - The document kind (text/pdf/docx).
 * @param url - Same-origin URL of the asset file.
 * @param name - Filename, used for the PDF frame title.
 * @param container - Element to fill with the rendered output.
 * @returns Promise that resolves once rendering completes.
 */
export const renderDoc = (
  kind: DocKind,
  url: string,
  name: string,
  container: HTMLElement,
): Promise<void> => {
  if (kind === 'text') return renderText(url, container);
  if (kind === 'pdf') {
    renderPdf(url, name, container);
    return Promise.resolve();
  }
  return renderDocx(url, container);
};
