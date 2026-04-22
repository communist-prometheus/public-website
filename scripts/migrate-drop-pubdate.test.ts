import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrate } from './migrate-drop-pubdate.lib.ts';

test('drops pubDate and copies it to publishDate when missing', () => {
  const src = `---\ntitle: T\npubDate: 2024-01-25\nlang: en\n---\nbody`;
  const out = migrate(src);
  assert.ok(out !== undefined);
  assert.doesNotMatch(out, /^pubDate:/m);
  assert.match(out, /^publishDate: 2024-01-25$/m);
});

test('drops pubDate and keeps existing publishDate', () => {
  const src = `---\ntitle: T\npubDate: 2024-01-25\npublishDate: 2024-06-01\n---`;
  const out = migrate(src);
  assert.ok(out !== undefined);
  assert.doesNotMatch(out, /^pubDate:/m);
  assert.match(out, /^publishDate: 2024-06-01$/m);
});

test('no-op when pubDate is absent', () => {
  const src = `---\ntitle: T\npublished: true\n---\nbody`;
  assert.equal(migrate(src), undefined);
});

test('is idempotent', () => {
  const src = `---\ntitle: T\npubDate: 2024-01-25\n---`;
  const once = migrate(src);
  assert.ok(once !== undefined);
  assert.equal(migrate(once), undefined);
});

test('returns undefined when no frontmatter', () => {
  assert.equal(migrate('# nope'), undefined);
});
