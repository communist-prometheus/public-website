import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { copyIssueAssets } from '../magazine-assets/copyIssueAssets';

/*
 * The .docx an editor imports from is never persisted — only the
 * derived .fb2 is uploaded to the content repo, so it just copies
 * straight through.
 */

/**
 * Build-time integration that copies magazine FB2 files into the dist
 * tree so they can be downloaded by their advertised URL.
 * @returns Astro integration definition.
 */
export const magazineFb2 = (): AstroIntegration => ({
  name: 'magazine-fb2',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const distRoot = fileURLToPath(dir);
      const copied = copyIssueAssets(distRoot, '.fb2');
      logger.info(`copied ${copied} magazine FB2(s) into ${distRoot}`);
    },
  },
});

export default magazineFb2;
