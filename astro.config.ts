import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  cacheDir: './.astro-cache',
  vite: {
    cacheDir: './.vite-cache'
  }
});
