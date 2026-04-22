import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { migrate } from './migrate-publish-flag.lib.ts';

const ROOTS = ['src/content/blog', 'src/content/positions', 'src/content/newspaper'] as const;

/** Walk `dir` recursively and yield every .md file path. */
const walk = async (dir: string): Promise<readonly string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
};

const run = async (): Promise<void> => {
  let changed = 0;
  for (const root of ROOTS) {
    const files = await walk(root).catch(() => []);
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const next = migrate(source);
      if (next !== undefined) {
        await writeFile(file, next, 'utf8');
        changed += 1;
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(`migrated ${changed} file(s)`);
};

run().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
