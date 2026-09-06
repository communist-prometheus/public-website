import { describe, expect, it } from 'vitest';
import { findFrontmatterProblems } from './frontmatter-problems';

/*
 * Both fixtures are the frontmatter that actually broke the deploys on
 * 2026-09-05: an unquoted multi-line `description` with a `: ` inside
 * (github.com web editor, comprom.org) and a bare `articles:` left by an
 * issue translation (admin, dev.comprom.org). The Astro build dies on
 * either; this validator must name them before the build runs.
 */
const UNQUOTED_MULTILINE = [
  '---',
  'title: Excess Capital And Excess Population',
  'lang: en',
  '',
  'description: While bourgeois thought writes off crises as “external shocks”, Marx exposes the paradox of the system: the simultaneous existence of surplus capital and surplus population.',
  '“Without revolutionary theory there can be no revolutionary movement”, reads the axiom.',
  'category: programme',
  'published: true',
  '---',
  '',
  'Body',
  '',
].join('\n');

const BARE_SEQUENCE = [
  '---',
  'title: Журнал «Коммунистический Прометей» №2 — август 2026',
  'lang: en',
  'pubDate: 2026-08-01',
  'published: false',
  'articles:',
  'image: ./assets/cover.ru.png',
  '---',
  '',
].join('\n');

const GOOD = [
  '---',
  'title: Excess Capital',
  'lang: en',
  'description: "Marx exposes the paradox of the system: surplus capital."',
  'category: programme',
  'articles: []',
  'published: true',
  '---',
  '',
  'Body',
  '',
].join('\n');

describe('findFrontmatterProblems', () => {
  it('reports invalid YAML with the parser position', () => {
    const problems = findFrontmatterProblems(UNQUOTED_MULTILINE);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('bad indentation of a mapping entry');
    /*
     * js-yaml points at the description line (fence line 4); the file line is
     * offset by the opening `---`.
     */
    expect(problems[0]?.line).toBe(5);
  });

  it('reports a key left without a value (YAML empty value) by name', () => {
    const problems = findFrontmatterProblems(BARE_SEQUENCE);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('articles');
    expect(problems[0]?.line).toBe(6);
  });

  it('accepts valid frontmatter, including an explicit empty list', () => {
    expect(findFrontmatterProblems(GOOD)).toEqual([]);
  });

  it('leaves files without a frontmatter fence alone', () => {
    expect(findFrontmatterProblems('# Just markdown\n')).toEqual([]);
  });

  it('rejects a frontmatter whose root is not a mapping', () => {
    const problems = findFrontmatterProblems('---\n- a\n- b\n---\n');
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('mapping');
  });

  it('tolerates CRLF line endings', () => {
    expect(findFrontmatterProblems(GOOD.replace(/\n/g, '\r\n'))).toEqual([]);
    expect(findFrontmatterProblems(BARE_SEQUENCE.replace(/\n/g, '\r\n'))).toHaveLength(1);
  });
});
