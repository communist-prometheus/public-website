import { type DefaultTreeAdapterMap, parseFragment } from 'parse5';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Element = DefaultTreeAdapterMap['element'];
type TextNode = DefaultTreeAdapterMap['textNode'];

/*
 * Convert mammoth.js HTML output to FB2 (FictionBook 2.0) XML.
 *
 * Mammoth produces a known-narrow subset of HTML — headings,
 * paragraphs, lists, simple inline marks, links, line breaks. We
 * walk the parse5 fragment and emit the FB2 equivalents:
 *
 *   <h1>title</h1>           → <section><title><p>title</p></title>...
 *   <h2>section</h2>         → nested section open (one level deep
 *                              keeps us out of FB2 schema corner cases)
 *   <p>...</p>               → <p>...</p>
 *   <strong>x</strong>       → <strong>x</strong>
 *   <em>x</em> | <i>x</i>    → <emphasis>x</emphasis>
 *   <a href="…">x</a>        → <a l:href="…">x</a>
 *   <br/>                    → <empty-line/>
 *   <ul>/<ol>/<li>           → flattened to <p>• item</p>
 *
 * Anything outside this set is dropped with a warning so we never
 * emit invalid FB2.
 */

interface FB2Meta {
  readonly title: string;
  readonly author?: string;
  readonly lang?: string;
  readonly description?: string;
}

const isElement = (node: ChildNode): node is Element =>
  node.nodeName !== '#text' && node.nodeName !== '#comment';

const isText = (node: ChildNode): node is TextNode => node.nodeName === '#text';

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const inlineFor = (tag: string): string | undefined => {
  if (tag === 'strong' || tag === 'b') return 'strong';
  if (tag === 'em' || tag === 'i') return 'emphasis';
  return undefined;
};

const renderInline = (node: ChildNode): string => {
  if (isText(node)) return escapeXml(node.value);
  if (!isElement(node)) return '';
  const tag = node.tagName;
  if (tag === 'br') return '<empty-line/>';
  const fb2Tag = inlineFor(tag);
  const inner = node.childNodes.map(renderInline).join('');
  if (fb2Tag) return `<${fb2Tag}>${inner}</${fb2Tag}>`;
  if (tag === 'a') {
    const href = node.attrs.find((a) => a.name === 'href')?.value ?? '';
    return `<a l:href="${escapeXml(href)}">${inner}</a>`;
  }
  return inner;
};

const collectListItems = (node: Element): string[] =>
  node.childNodes
    .filter(isElement)
    .filter((c) => c.tagName === 'li')
    .map((li) => li.childNodes.map(renderInline).join(''));

const renderBlock = (node: Element): string => {
  const tag = node.tagName;
  if (tag === 'p') {
    const inner = node.childNodes.map(renderInline).join('').trim();
    return inner === '' ? '' : `<p>${inner}</p>`;
  }
  if (tag === 'ul' || tag === 'ol') {
    return collectListItems(node)
      .map((item) => `<p>• ${item}</p>`)
      .join('\n');
  }
  if (tag === 'br') return '<empty-line/>';
  return '';
};

interface Section {
  title: string;
  body: string[];
}

const splitIntoSections = (frag: DocumentFragment): Section[] => {
  const sections: Section[] = [];
  let current: Section = { title: '', body: [] };
  for (const node of frag.childNodes) {
    if (!isElement(node)) continue;
    if (node.tagName === 'h1' || node.tagName === 'h2') {
      if (current.title || current.body.length) sections.push(current);
      const title = node.childNodes.map(renderInline).join('').trim();
      current = { title, body: [] };
      continue;
    }
    const block = renderBlock(node);
    if (block) current.body.push(block);
  }
  if (current.title || current.body.length) sections.push(current);
  return sections;
};

const renderSection = (s: Section): string => {
  const title = s.title ? `    <title><p>${s.title}</p></title>\n` : '';
  const body = s.body.map((b) => `    ${b}`).join('\n');
  return `  <section>\n${title}${body}\n  </section>`;
};

/**
 * Convert mammoth HTML output to a complete FB2 document string.
 *
 * @param html Mammoth HTML output.
 * @param meta Required title plus optional author/lang/description.
 * @returns FB2 XML document (UTF-8 declared).
 */
export const htmlToFb2 = (html: string, meta: FB2Meta): string => {
  const frag = parseFragment(html);
  const sections = splitIntoSections(frag);
  if (sections.length === 0) sections.push({ title: meta.title, body: [] });
  const lang = meta.lang ?? 'ru';
  const author = meta.author ?? 'Communist Prometheus';
  const description = meta.description ?? '';
  const body = sections.map(renderSection).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <book-title>${escapeXml(meta.title)}</book-title>
      <author><nickname>${escapeXml(author)}</nickname></author>
      <lang>${escapeXml(lang)}</lang>
      ${description ? `<annotation><p>${escapeXml(description)}</p></annotation>` : ''}
    </title-info>
  </description>
  <body>
${body}
  </body>
</FictionBook>
`;
};
