import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const CONTENT_DIR = resolve('src/content/newspaper');

/*
 * NewspaperCard.astro hardcodes the download link to
 *   /newspaper/{slug}/assets/gazette.pdf
 *
 * Astro's content collections strip non-image assets from the build,
 * so the PDFs that editors upload via the admin (or that land via
 * direct content commits) never reach `dist/`. This integration
 * copies every `*.pdf` from `src/content/newspaper/{slug}/assets/`
 * into `dist/newspaper/{slug}/assets/` after the build is done so the
 * download link resolves to a real file under CF Workers.
 */
const copyPdfsTo = (distRoot: string): number => {
  if (!existsSync(CONTENT_DIR)) return 0;

  let copied = 0;
  for (const slug of readdirSync(CONTENT_DIR)) {
    const assetsDir = join(CONTENT_DIR, slug, 'assets');
    if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) continue;

    const targetDir = join(distRoot, 'newspaper', slug, 'assets');
    for (const file of readdirSync(assetsDir)) {
      if (extname(file).toLowerCase() !== '.pdf') continue;
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(join(assetsDir, file), join(targetDir, file));
      copied += 1;
    }
  }
  return copied;
};

/**
 * Build-time integration that copies newspaper PDFs into the dist
 * tree so they can be downloaded by their advertised URL.
 * @returns Astro integration definition.
 */
export const newspaperPdfs = (): AstroIntegration => ({
  name: 'newspaper-pdfs',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const distRoot = fileURLToPath(dir);
      const copied = copyPdfsTo(distRoot);
      logger.info(`copied ${copied} newspaper PDF(s) into ${distRoot}`);
    },
  },
});

export default newspaperPdfs;
