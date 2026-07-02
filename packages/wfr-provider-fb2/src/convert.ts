import { escapeHtml } from './escape-html';

/** One renderable FB2 page (a top-level section, or the whole body). */
export interface Fb2Page {
  readonly id: string;
  readonly label: string;
  readonly html: string;
}

/** Inline FB2 elements mapped 1:1 to HTML inline tags. */
const inlineTags: Readonly<Record<string, string>> = {
  emphasis: 'em',
  strong: 'strong',
  strikethrough: 's',
  sub: 'sub',
  sup: 'sup',
  code: 'code',
};

const localName = (el: Element): string => el.localName.toLowerCase();

/** Concatenate the converted HTML of every child node. */
const childrenHtml = (node: Node): string =>
  Array.from(node.childNodes, nodeToHtml).join('');

/** Convert a single FB2 DOM node to an HTML fragment string. */
const nodeToHtml = (node: Node): string => {
  if (node instanceof Text) return escapeHtml(node.textContent ?? '');
  if (!(node instanceof Element)) return '';
  const el = node;
  const name = localName(el);
  const inline = inlineTags[name];
  if (inline !== undefined) return `<${inline}>${childrenHtml(el)}</${inline}>`;
  switch (name) {
    case 'p':
      return `<p>${childrenHtml(el)}</p>`;
    case 'empty-line':
      return '<br>';
    case 'subtitle':
      return `<h4>${childrenHtml(el)}</h4>`;
    case 'title':
      return `<header class="fb2-title">${childrenHtml(el)}</header>`;
    case 'epigraph':
    case 'cite':
      return `<blockquote>${childrenHtml(el)}</blockquote>`;
    case 'poem':
      return `<div class="fb2-poem">${childrenHtml(el)}</div>`;
    case 'stanza':
      return `<p class="fb2-stanza">${childrenHtml(el)}</p>`;
    case 'v':
      return `${childrenHtml(el)}<br>`;
    case 'text-author':
      return `<p class="fb2-author">${childrenHtml(el)}</p>`;
    case 'section':
      return `<section>${childrenHtml(el)}</section>`;
    default:
      return childrenHtml(el);
  }
};

/** First child element matching `name` (case-insensitive local name). */
const firstChild = (parent: Element, name: string): Element | undefined =>
  Array.from(parent.children).find((child) => localName(child) === name);

/** All child elements matching `name`. */
const childrenNamed = (parent: Element, name: string): readonly Element[] =>
  Array.from(parent.children).filter((child) => localName(child) === name);

/** Extract a short text label from a section's `<title>`, if any. */
const sectionLabel = (section: Element, index: number): string => {
  const title = firstChild(section, 'title');
  const text = title?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return text.length > 0 ? text : `Section ${index + 1}`;
};

/** The main body — the first `<body>` that is not the notes body. */
const mainBody = (root: Element): Element | undefined => {
  const bodies = childrenNamed(root, 'body');
  return bodies.find((b) => b.getAttribute('name') !== 'notes') ?? bodies[0];
};

/**
 * Convert an FB2 XML string to renderable pages. Each top-level `<section>` of
 * the main body becomes one page; a body with no sections yields a single page.
 * Throws on malformed XML or a missing FictionBook root.
 */
export const fb2ToPages = (xml: string): readonly Fb2Page[] => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid FB2 (XML parse error).');
  const root = doc.documentElement;
  if (root.localName.toLowerCase() !== 'fictionbook') {
    throw new Error('Not a FictionBook (FB2) document.');
  }
  const body = mainBody(root);
  if (body === undefined) throw new Error('FB2 document has no <body>.');
  const sections = childrenNamed(body, 'section');
  if (sections.length === 0) {
    return [{ id: 'body', label: 'Content', html: childrenHtml(body) }];
  }
  return sections.map((section, index) => ({
    id: `section-${index + 1}`,
    label: sectionLabel(section, index),
    html: childrenHtml(section),
  }));
};
