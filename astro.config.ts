import { defineConfig } from 'astro/config';
import contentMedia from './src/integrations/content-media';
import newspaperDocxFb2 from './src/integrations/newspaper-docx-fb2';
import newspaperPdfs from './src/integrations/newspaper-pdfs';
import swManifest from './src/integrations/sw-manifest';

export default defineConfig({
  site: 'https://comprom.org',
  cacheDir: './.astro-cache',
  integrations: [contentMedia(), newspaperPdfs(), newspaperDocxFb2(), swManifest()],
  vite: {
    cacheDir: './.vite-cache',
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
