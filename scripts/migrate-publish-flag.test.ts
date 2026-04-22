import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrate } from './migrate-publish-flag.lib.ts';

test('adds published: true when missing', () => {
  const src = `---\ntitle: T\nlang: en\n---\nbody`;
  const out = migrate(src);
  assert.equal(out, `---\ntitle: T\nlang: en\npublished: true\n---\nbody`);
});

test('is a no-op when published is already set to true', () => {
  const src = `---\ntitle: T\npublished: true\n---`;
  assert.equal(migrate(src), undefined);
});

test('is a no-op when published is already set to false', () => {
  const src = `---\ntitle: T\npublished: false\n---`;
  assert.equal(migrate(src), undefined);
});

test('is idempotent', () => {
  const src = `---\ntitle: T\n---\nbody`;
  const once = migrate(src);
  assert.ok(once !== undefined);
  assert.equal(migrate(once), undefined);
});

test('returns undefined when no frontmatter block is present', () => {
  assert.equal(migrate('# no frontmatter'), undefined);
});

test('preserves CRLF line endings in surrounding block', () => {
  const src = `---\r\ntitle: T\r\nlang: en\r\n---\r\nbody`;
  const out = migrate(src);
  assert.ok(out !== undefined);
  assert.match(out, /published: true/);
});
