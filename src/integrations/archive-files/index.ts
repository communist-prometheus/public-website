import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const CONTENT_DIR = resolve('src/content/archive');

/*
 * Archive items keep arbitrary files under
 *   src/content/archive/{slug}/assets/*
 *
 * Astro's content collections only emit images referenced through the
 * `image()` schema; every other file (zip, pdf, doc, dataset, …) and
 * even gallery images that the page links to by raw URL are dropped
 * from the build. This integration copies every file from each item's
 * `assets/` directory into `dist/archive/{slug}/assets/` after the
 * build so the download links the pages advertise resolve to real
 * files under CF Workers.
 */
const copyAssetsTo = (distRoot: string): number => {
  if (!existsSync(CONTENT_DIR)) return 0;

  let copied = 0;
  for (const slug of readdirSync(CONTENT_DIR)) {
    const assetsDir = join(CONTENT_DIR, slug, 'assets');
    if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) continue;

    const targetDir = join(distRoot, 'archive', slug, 'assets');
    for (const file of readdirSync(assetsDir)) {
      const src = join(assetsDir, file);
      if (!statSync(src).isFile()) continue;
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(src, join(targetDir, file));
      copied += 1;
    }
  }
  return copied;
};

/**
 * Build-time integration that copies archive-item files into the dist
 * tree so they can be downloaded by their advertised URL.
 * @returns Astro integration definition.
 */
export const archiveFiles = (): AstroIntegration => ({
  name: 'archive-files',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const distRoot = fileURLToPath(dir);
      const copied = copyAssetsTo(distRoot);
      logger.info(`copied ${copied} archive file(s) into ${distRoot}`);
    },
  },
});

export default archiveFiles;
