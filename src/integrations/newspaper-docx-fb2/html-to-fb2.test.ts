import { describe, expect, it } from 'vitest';
import { htmlToFb2 } from './html-to-fb2';

const meta = {
  title: 'Test issue',
  author: 'Test',
  lang: 'ru',
};

describe('htmlToFb2', () => {
  it('renders the FB2 wrapper with declared encoding and namespace', () => {
    const out = htmlToFb2('<p>Hello</p>', meta);
    expect(out).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(out).toContain('xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"');
    expect(out).toContain('xmlns:l="http://www.w3.org/1999/xlink"');
  });

  it('writes the title-info block from meta', () => {
    const out = htmlToFb2('<p>x</p>', meta);
    expect(out).toContain('<book-title>Test issue</book-title>');
    expect(out).toContain('<nickname>Test</nickname>');
    expect(out).toContain('<lang>ru</lang>');
  });

  it('escapes XML-unsafe characters in metadata', () => {
    const out = htmlToFb2('<p>x</p>', { title: 'A & B <c>' });
    expect(out).toContain('<book-title>A &amp; B &lt;c&gt;</book-title>');
  });

  it('promotes h1/h2 headings to <section><title>', () => {
    const html = '<h1>Chapter</h1><p>Body</p>';
    const out = htmlToFb2(html, meta);
    expect(out).toContain('<section>');
    expect(out).toContain('<title><p>Chapter</p></title>');
    expect(out).toContain('<p>Body</p>');
  });

  it('starts a new section on every h1/h2 boundary', () => {
    const html = '<h1>One</h1><p>a</p><h2>Two</h2><p>b</p>';
    const out = htmlToFb2(html, meta);
    const sectionCount = (out.match(/<section>/g) ?? []).length;
    expect(sectionCount).toBe(2);
  });

  it('rewrites strong/em inline marks to FB2 equivalents', () => {
    const html = '<p><strong>bold</strong> and <em>italic</em> and <i>also-italic</i></p>';
    const out = htmlToFb2(html, meta);
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<emphasis>italic</emphasis>');
    expect(out).toContain('<emphasis>also-italic</emphasis>');
  });

  it('rewrites <a href> to <a l:href>', () => {
    const html = '<p>see <a href="https://x.test/a&b">here</a></p>';
    const out = htmlToFb2(html, meta);
    expect(out).toContain('<a l:href="https://x.test/a&amp;b">here</a>');
  });

  it('flattens lists into bullet paragraphs', () => {
    const html = '<ul><li>one</li><li>two</li></ul>';
    const out = htmlToFb2(html, meta);
    expect(out).toContain('<p>• one</p>');
    expect(out).toContain('<p>• two</p>');
  });

  it('drops empty paragraphs to keep the FB2 valid', () => {
    const html = '<p></p><p>real text</p>';
    const out = htmlToFb2(html, meta);
    expect(out).toContain('<p>real text</p>');
    expect(out).not.toContain('<p></p>');
  });

  it('renders <br> as <empty-line/>', () => {
    const html = '<p>line one<br/>line two</p>';
    const out = htmlToFb2(html, meta);
    expect(out).toContain('line one<empty-line/>line two');
  });

  it('falls back to a stub section when input has no headings or text', () => {
    const out = htmlToFb2('', { title: 'Empty' });
    expect(out).toContain('<section>');
    expect(out).toContain('<title><p>Empty</p></title>');
  });
});
