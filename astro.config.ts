import { defineConfig } from 'astro/config';
import contentMedia from './src/integrations/content-media';
import newspaperPdfs from './src/integrations/newspaper-pdfs';
import swManifest from './src/integrations/sw-manifest';

export default defineConfig({
  site: 'https://comprom.org',
  cacheDir: './.astro-cache',
  integrations: [contentMedia(), newspaperPdfs(), swManifest()],
  vite: {
    cacheDir: './.vite-cache',
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
