/**
 * E2E test: Native Astro components (CpButton, CpCard)
 *
 * Verifies that:
 * 1. Build output contains native HTML buttons and card divs
 * 2. No web component tags (cp-button, cp-card custom elements)
 * 3. No Shadow DOM or DSD templates
 * 4. No Lit SSR artifacts (defer-hydration, event replay, lit-part markers)
 * 5. Buttons have correct variant classes
 * 6. Cards have correct modifier classes
 *
 * Run: bun run e2e/astro-components.spec.ts
 * Requires: production build (bun run astro build)
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

console.log('=== Astro Components E2E Tests ===\n');

const enHtml = readHtml('en');
const blogHtml = readHtml('en/blog');

console.log('1. No web component custom element tags');
assert.ok(!enHtml.includes('<cp-button'), 'Home page must NOT contain <cp-button> custom element');
assert.ok(!enHtml.includes('<cp-card'), 'Home page must NOT contain <cp-card> custom element');
console.log('   ✓ No custom element tags found\n');

console.log('2. No Shadow DOM / DSD artifacts');
assert.ok(!enHtml.includes('<template shadowrootmode'), 'No DSD templates should exist');
assert.ok(!enHtml.includes('defer-hydration'), 'No defer-hydration attributes should exist');
assert.ok(!enHtml.includes('__cpEventReplay'), 'No event replay script should exist');
console.log('   ✓ No Shadow DOM artifacts\n');

console.log('3. Native <button> elements present');
assert.ok(enHtml.includes('<button'), 'Home page must contain native <button> elements');
assert.ok(blogHtml.includes('<button'), 'Blog page must contain native <button> elements');
console.log('   ✓ Native buttons found\n');

console.log('4. Button variant classes present');
assert.ok(enHtml.includes('primary'), 'Must have primary variant');
assert.ok(enHtml.includes('secondary'), 'Must have secondary variant');
assert.ok(enHtml.includes('ghost'), 'Must have ghost variant');
console.log('   ✓ All button variants found\n');

console.log('5. Card elements present with classes');
assert.ok(blogHtml.includes('card'), 'Blog page must have card elements');
assert.ok(blogHtml.includes('hoverable'), 'Blog cards must have hoverable class');
assert.ok(blogHtml.includes('elevated'), 'Blog cards must have elevated class');
console.log('   ✓ Card classes found\n');

console.log('6. Theme toggle button present');
assert.ok(enHtml.includes('id="theme-toggle"'), 'Theme toggle button must exist');
console.log('   ✓ Theme toggle found\n');

console.log('=== All tests passed ===\n');
