import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import archiveFiles from './src/integrations/archive-files';
import contentMedia from './src/integrations/content-media';
import magazineFb2 from './src/integrations/magazine-fb2';
import magazinePdfs from './src/integrations/magazine-pdfs';
import swManifest from './src/integrations/sw-manifest';

/*
 * `@astrojs/sitemap` emits sitemap-index.xml + sitemap-0.xml at the
 * site root and inlines `<xhtml:link rel="alternate" hreflang="…">`
 * for every locale that owns the same path. Without these pairings
 * Google treats `/en/blog/foo` and `/ru/blog/foo` as duplicate
 * content and only ranks one of them. The locale codes follow the
 * project's existing `settings/languages.json` (bl → bg-BG since
 * Bulgarian's BCP-47 tag is `bg`; the route still uses `bl`).
 */
export default defineConfig({
  site: 'https://comprom.org',
  cacheDir: './.astro-cache',
  /*
   * Prefetch internal links as they enter the viewport so a click
   * navigates near-instantly instead of staring at an unchanged page
   * while the next document loads. Pairs with ClientRouter's
   * view-transition cross-fade for visible feedback on every nav.
   */
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  integrations: [
    contentMedia(),
    magazinePdfs(),
    magazineFb2(),
    archiveFiles(),
    swManifest(),
    sitemap({
      /*
       * `/test-*` pages exist in the build so e2e can exercise
       * client-side scripts against the production bundle. Filter
       * them out of the sitemap so they never reach search results.
       */
      filter: (page) => !page.includes('/test-'),
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          ru: 'ru-RU',
          it: 'it-IT',
          es: 'es-ES',
          bl: 'bg-BG',
          pl: 'pl-PL',
          uk: 'uk-UA',
        },
      },
    }),
  ],
  vite: {
    cacheDir: './.vite-cache',
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
