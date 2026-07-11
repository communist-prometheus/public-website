import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { copyIssueAssets } from '../magazine-assets/copyIssueAssets';

/**
 * Build-time integration that copies magazine PDFs into the dist tree
 * so they can be downloaded by their advertised URL.
 * @returns Astro integration definition.
 */
export const magazinePdfs = (): AstroIntegration => ({
  name: 'magazine-pdfs',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const distRoot = fileURLToPath(dir);
      const copied = copyIssueAssets(distRoot, '.pdf');
      logger.info(`copied ${copied} magazine PDF(s) into ${distRoot}`);
    },
  },
});

export default magazinePdfs;
