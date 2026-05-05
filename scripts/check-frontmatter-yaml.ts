/*
 * Validate every content-collection markdown file's frontmatter
 * by feeding it to js-yaml. Print every failing file + reason.
 *
 * One-shot diagnostic — reuse the script if more frontmatter
 * regressions slip in. Run after `bun run fetch-content`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

const walk = (dir: string): readonly string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
};

const main = (): void => {
  const root = resolve('src/content');
  const failed: ReadonlyArray<{ f: string; msg: string }> = walk(root)
    .map((f) => {
      const raw = readFileSync(f, 'utf8');
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!m) return undefined;
      try {
        yaml.load(m[1] ?? '');
        return undefined;
      } catch (e) {
        return { f, msg: String((e as Error).message).split('\n')[0] };
      }
    })
    .filter((x): x is { f: string; msg: string } => x !== undefined);

  if (failed.length === 0) {
    process.stdout.write('all frontmatter parses OK\n');
    return;
  }
  for (const { f, msg } of failed) process.stdout.write(`${f}\n  ${msg}\n`);
  process.exit(1);
};

main();
