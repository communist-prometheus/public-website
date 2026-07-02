import { escapeHtml } from './escape-html';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

const localName = (el: Element): string => el.localName.toLowerCase();

/** All child elements of `parent` with the given local name. */
const childrenNamed = (parent: Element, name: string): readonly Element[] =>
  Array.from(parent.children).filter((child) => localName(child) === name);

/** First child element with the given local name. */
const firstChild = (parent: Element, name: string): Element | undefined =>
  Array.from(parent.children).find((child) => localName(child) === name);

/** Read a WordprocessingML attribute, tolerating prefixed/namespaced forms. */
const attr = (el: Element, name: string): string | undefined =>
  el.getAttributeNS(W_NS, name) ?? el.getAttribute(`w:${name}`) ?? el.getAttribute(name) ?? undefined;

/** A `<w:b/>`-style toggle is on unless its `w:val` is a falsey value. */
const toggleOn = (parent: Element | undefined, name: string): boolean => {
  if (parent === undefined) return false;
  const el = firstChild(parent, name);
  if (el === undefined) return false;
  const val = attr(el, 'val');
  return val !== '0' && val !== 'false' && val !== 'off';
};

/** Convert one `<w:r>` run to an inline HTML string. */
const runHtml = (run: Element): string => {
  const rpr = firstChild(run, 'rpr');
  let text = '';
  for (const node of Array.from(run.children)) {
    switch (localName(node)) {
      case 't':
        text += escapeHtml(node.textContent ?? '');
        break;
      case 'br':
        text += '<br>';
        break;
      case 'tab':
        text += '&#9;';
        break;
      default:
        break;
    }
  }
  if (text === '') return '';
  let html = text;
  if (toggleOn(rpr, 'b')) html = `<strong>${html}</strong>`;
  if (toggleOn(rpr, 'i')) html = `<em>${html}</em>`;
  if (firstChild(rpr ?? run, 'u') !== undefined && toggleOn(rpr, 'u')) html = `<u>${html}</u>`;
  return html;
};

/** Inline HTML for a paragraph's runs (including runs inside hyperlinks). */
const inlineHtml = (paragraph: Element): string => {
  let html = '';
  for (const child of Array.from(paragraph.children)) {
    const name = localName(child);
    if (name === 'r') html += runHtml(child);
    else if (name === 'hyperlink') html += inlineHtml(child);
  }
  return html;
};

/** Map a Word paragraph style to its HTML block tag. */
const blockTag = (style: string | undefined): string => {
  switch (style) {
    case 'Title':
    case 'Heading1':
      return 'h1';
    case 'Heading2':
      return 'h2';
    case 'Heading3':
      return 'h3';
    case 'Heading4':
      return 'h4';
    default:
      return 'p';
  }
};

const paragraphHtml = (paragraph: Element): string => {
  const style = attr(firstChild(firstChild(paragraph, 'ppr') ?? paragraph, 'pstyle') ?? paragraph, 'val');
  const tag = blockTag(style);
  const inner = inlineHtml(paragraph);
  if (inner === '' && tag === 'p') return '';
  return `<${tag}>${inner === '' ? '' : inner}</${tag}>`;
};

const cellHtml = (cell: Element): string =>
  `<td>${childrenNamed(cell, 'p').map(paragraphHtml).join('')}</td>`;

const rowHtml = (row: Element): string =>
  `<tr>${childrenNamed(row, 'tc').map(cellHtml).join('')}</tr>`;

const tableHtml = (table: Element): string =>
  `<table>${childrenNamed(table, 'tr').map(rowHtml).join('')}</table>`;

const blockHtml = (el: Element): string => {
  switch (localName(el)) {
    case 'p':
      return paragraphHtml(el);
    case 'tbl':
      return tableHtml(el);
    default:
      return '';
  }
};

/**
 * Convert a DOCX `word/document.xml` string to an HTML fragment. Throws when the
 * XML is malformed or has no `<w:body>`.
 */
export const documentXmlToHtml = (xml: string): string => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid DOCX (XML parse error).');
  const body = firstChild(doc.documentElement, 'body');
  if (body === undefined) throw new Error('DOCX document.xml has no <w:body>.');
  return Array.from(body.children).map(blockHtml).join('');
};
