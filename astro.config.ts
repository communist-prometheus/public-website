import { defineConfig } from 'astro/config';

export default defineConfig({
  cacheDir: './.astro-cache',
  vite: {
    cacheDir: './.vite-cache',
  },
});
