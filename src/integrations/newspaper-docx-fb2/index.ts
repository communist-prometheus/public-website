import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import mammoth from 'mammoth';
import { htmlToFb2 } from './html-to-fb2';

const CONTENT_DIR = resolve('src/content/newspaper');

interface IssueMeta {
  readonly title: string;
  readonly lang?: string;
  readonly description?: string;
}

/*
 * Read the issue's frontmatter (any of `index.{lang}.md`) for the
 * title that becomes the FB2 book-title. Editors fill the title at
 * upload time anyway; we just lift the first non-draft entry.
 */
const readIssueMeta = (slugDir: string): IssueMeta => {
  for (const f of readdirSync(slugDir)) {
    if (!/^index\.[a-z]{2}\.md$/.test(f)) continue;
    const raw = readFileSync(join(slugDir, f), 'utf-8');
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!m) continue;
    const fm = m[1] ?? '';
    const title = fm.match(/^title:\s*(.+?)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g, '');
    const lang = f.match(/^index\.([a-z]{2})\.md$/)?.[1];
    const description = fm.match(/^description:\s*(.+?)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g, '');
    if (title) return { title, ...(lang && { lang }), ...(description && { description }) };
  }
  return { title: 'Newspaper issue' };
};

const convertOne = async (slug: string, docxPath: string, targetDir: string): Promise<void> => {
  const html = (await mammoth.convertToHtml({ path: docxPath })).value;
  const meta = readIssueMeta(join(CONTENT_DIR, slug));
  const fb2 = htmlToFb2(html, meta);
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(docxPath, join(targetDir, 'gazette.docx'));
  writeFileSync(join(targetDir, 'gazette.fb2'), fb2, 'utf-8');
};

const run = async (distRoot: string): Promise<number> => {
  if (!existsSync(CONTENT_DIR)) return 0;
  let converted = 0;
  for (const slug of readdirSync(CONTENT_DIR)) {
    const assetsDir = join(CONTENT_DIR, slug, 'assets');
    if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) continue;
    const docx = readdirSync(assetsDir).find((f) => extname(f).toLowerCase() === '.docx');
    if (!docx) continue;
    const targetDir = join(distRoot, 'newspaper', slug, 'assets');
    await convertOne(slug, join(assetsDir, docx), targetDir);
    converted += 1;
  }
  return converted;
};

/**
 * Build-time integration that finds every newspaper issue's `.docx`
 * source under src/content/newspaper, copies it through to dist
 * (preserving the docx download URL the card advertises) and emits
 * a sibling `.fb2` rendition for offline e-readers. Skips silently
 * when no docx is present, which is the default state for issues
 * that only ship a PDF.
 *
 * @returns Astro integration definition.
 */
export const newspaperDocxFb2 = (): AstroIntegration => ({
  name: 'newspaper-docx-fb2',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const distRoot = fileURLToPath(dir);
      const converted = await run(distRoot);
      logger.info(`converted ${converted} newspaper docx → fb2 in ${distRoot}`);
    },
  },
});

export default newspaperDocxFb2;
