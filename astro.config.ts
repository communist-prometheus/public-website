import { defineConfig } from 'astro/config';
import swManifest from './src/integrations/sw-manifest';

export default defineConfig({
  cacheDir: './.astro-cache',
  integrations: [swManifest()],
  vite: {
    cacheDir: './.vite-cache',
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
