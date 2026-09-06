/*
 * Validate every content-collection markdown file's frontmatter before
 * the Astro build runs, so a broken file is named by path + line
 * instead of surfacing as an opaque build error.
 *
 * Two modes:
 *   - default (local / CI check): print every problem and exit 1;
 *   - CONTENT_QUARANTINE=1 (the deploy): remove the broken files from
 *     the build tree, print them as GitHub warning annotations + a step
 *     summary, and exit 0 — so ONE bad article (an unquoted `:` pasted
 *     into a description on github.com, an empty `articles:` …) blocks
 *     only itself, never every other editor's publish. The removal is
 *     local to the checkout; the file stays in git for the author to fix.
 *
 * Problems are always emitted as `::error` / `::warning` workflow
 * annotations (file + line), which the Actions UI pins to the run.
 * Run after `bun run fetch-content`.
 */
import { appendFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import {
  type FrontmatterProblem,
  findFrontmatterProblems,
} from '../src/features/content/helpers/frontmatter-problems';

interface BrokenFile {
  readonly file: string;
  readonly problems: readonly FrontmatterProblem[];
}

const env = (key: string): string | undefined => process.env[key];

const walk = (dir: string): readonly string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
};

const toPosix = (path: string): string => path.replace(/\\/g, '/');

/** One GitHub Actions annotation line (`::error file=…,line=…::message`). */
const annotation = (
  level: 'error' | 'warning',
  file: string,
  problem: FrontmatterProblem,
): string => {
  const at = problem.line === undefined ? '' : `,line=${problem.line}`;
  return `::${level} file=${toPosix(relative(process.cwd(), file))}${at}::${problem.message}`;
};

const report = (level: 'error' | 'warning', broken: readonly BrokenFile[]): void => {
  for (const { file, problems } of broken) {
    process.stdout.write(`${file}\n`);
    for (const problem of problems) {
      const at = problem.line === undefined ? '' : ` (line ${problem.line})`;
      process.stdout.write(`  ${problem.message}${at}\n`);
      process.stdout.write(`${annotation(level, file, problem)}\n`);
    }
  }
};

/** A markdown table for the job summary (`$GITHUB_STEP_SUMMARY`), when CI provides one. */
const writeSummary = (broken: readonly BrokenFile[]): void => {
  const summaryPath = env('GITHUB_STEP_SUMMARY');
  if (summaryPath === undefined) return;
  const rows = broken.flatMap(({ file, problems }) =>
    problems.map(
      (p) => `| \`${toPosix(relative(process.cwd(), file))}\` | ${p.line ?? ''} | ${p.message} |`,
    ),
  );
  appendFileSync(
    summaryPath,
    [
      '## ⚠️ Content quarantined from this deploy',
      '',
      'These files have unbuildable frontmatter and were left out of the build. Fix them in the content repo to publish them.',
      '',
      '| File | Line | Problem |',
      '| --- | --- | --- |',
      ...rows,
      '',
    ].join('\n'),
  );
};

const main = (): void => {
  const root = resolve('src/content');
  const broken: readonly BrokenFile[] = walk(root)
    .map((file) => ({ file, problems: findFrontmatterProblems(readFileSync(file, 'utf8')) }))
    .filter((x) => x.problems.length > 0);

  if (broken.length === 0) {
    process.stdout.write('all frontmatter parses OK\n');
    return;
  }
  if (env('CONTENT_QUARANTINE') !== '1') {
    report('error', broken);
    process.exit(1);
  }
  report('warning', broken);
  for (const { file } of broken) rmSync(file);
  writeSummary(broken);
  process.stdout.write(
    `[check-frontmatter] quarantined ${broken.length} file(s) from this build\n`,
  );
};

main();
