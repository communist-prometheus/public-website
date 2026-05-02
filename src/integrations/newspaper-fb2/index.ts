import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const CONTENT_DIR = resolve('src/content/newspaper');

/*
 * NewspaperCard advertises a download link at
 *   /newspaper/{slug}/assets/gazette.fb2
 *
 * Astro's content-collections strip non-image assets from the build,
 * so anything an editor uploads via the admin (PDF, FB2) needs an
 * explicit copy step. The PDF passthrough lives in newspaper-pdfs;
 * this sibling integration handles `.fb2` the same way. The .docx
 * source the editor imports from is *not* persisted — only the
 * derived .fb2 is uploaded to the content repo, so we just copy it
 * straight through here.
 */
const copyFb2sTo = (distRoot: string): number => {
  if (!existsSync(CONTENT_DIR)) return 0;

  let copied = 0;
  for (const slug of readdirSync(CONTENT_DIR)) {
    const assetsDir = join(CONTENT_DIR, slug, 'assets');
    if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) continue;

    const targetDir = join(distRoot, 'newspaper', slug, 'assets');
    for (const file of readdirSync(assetsDir)) {
      if (extname(file).toLowerCase() !== '.fb2') continue;
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(join(assetsDir, file), join(targetDir, file));
      copied += 1;
    }
  }
  return copied;
};

/**
 * Build-time integration that copies newspaper FB2 files into the
 * dist tree so they can be downloaded by their advertised URL.
 *
 * @returns Astro integration definition.
 */
export const newspaperFb2 = (): AstroIntegration => ({
  name: 'newspaper-fb2',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const distRoot = fileURLToPath(dir);
      const copied = copyFb2sTo(distRoot);
      logger.info(`copied ${copied} newspaper FB2(s) into ${distRoot}`);
    },
  },
});

export default newspaperFb2;
