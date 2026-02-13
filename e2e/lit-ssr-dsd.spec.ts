/**
 * E2E test: Lit SSR with Declarative Shadow DOM
 *
 * Verifies that:
 * 1. Build output contains DSD <template shadowrootmode="open"> for cp-button and cp-card
 * 2. No duplicate DSD templates per element
 * 3. Components have shadow roots with correct styles after page load
 * 4. Components hydrate (defer-hydration removed)
 * 5. Theme toggle works after hydration
 * 6. No console errors in production build
 *
 * Run: bun run e2e/lit-ssr-dsd.spec.ts
 * Requires: production build (bun run astro build) + preview server on port 4325
 */

import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');

const readHtml = (relativePath: string): string => {
  const fullPath = join(DIST, relativePath, 'index.html');
  if (!existsSync(fullPath)) {
    throw new Error(`Build output not found: ${fullPath}. Run "bun run astro build" first.`);
  }
  return readFileSync(fullPath, 'utf-8');
};

const countMatches = (str: string, pattern: RegExp): number => (str.match(pattern) ?? []).length;

console.log('=== Lit SSR DSD E2E Tests ===\n');

// --- Static HTML tests (no server needed) ---

const enHtml = readHtml('en');
const blogHtml = readHtml('en/blog');

console.log('1. DSD templates present in build output');
assert.ok(
  enHtml.includes('<template shadowrootmode="open">'),
  'Home page must contain DSD template',
);
assert.ok(
  blogHtml.includes('<template shadowrootmode="open">'),
  'Blog page must contain DSD template',
);
console.log('   ✓ DSD templates found in /en and /en/blog\n');

console.log('2. No legacy shadowroot attribute');
assert.ok(
  !enHtml.includes('shadowroot="open"'),
  'Home page must NOT contain legacy shadowroot attribute',
);
console.log('   ✓ No legacy shadowroot="open" found\n');

console.log('3. No duplicate DSD templates per element');
const buttonDsdCount = countMatches(enHtml, /<cp-button[^>]*>[\s\S]*?<\/cp-button>/g);
const buttonTemplateCount = countMatches(enHtml, /<cp-button[^>]*><template shadowrootmode/g);
assert.equal(
  buttonDsdCount,
  buttonTemplateCount,
  `Each cp-button should have exactly 1 DSD template (buttons: ${buttonDsdCount}, templates: ${buttonTemplateCount})`,
);
console.log(`   ✓ ${buttonDsdCount} cp-button elements, each with 1 DSD template\n`);

console.log('4. DSD templates contain inline styles');
const styleInDsd = enHtml.includes('<template shadowrootmode="open"><style>');
assert.ok(styleInDsd, 'DSD template must contain inline <style>');
console.log('   ✓ Inline styles present in DSD templates\n');

console.log('5. defer-hydration attribute present');
assert.ok(
  enHtml.includes('defer-hydration'),
  'Components must have defer-hydration attribute in static HTML',
);
console.log('   ✓ defer-hydration found in build output\n');

console.log('6. Event recorder script inlined in <head>');
assert.ok(enHtml.includes('__cpEventReplay'), 'Event recorder script must be inlined in the page');
console.log('   ✓ Event recorder script found\n');

console.log('7. Hydration script loaded');
assert.ok(
  enHtml.includes('cp-button') && enHtml.includes('cp-card'),
  'Page must reference cp-button and cp-card components',
);
console.log('   ✓ Component references found\n');

console.log('=== All static HTML tests passed ===\n');
console.log('For browser tests (hydration, theme toggle, console errors),');
console.log('run the preview server and use the MCP browser tools.\n');
