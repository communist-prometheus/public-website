import type { SearchIndex } from '@prometheus/search-core';
import type { APIContext } from 'astro';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/config/i18n';
import { buildIndex } from '@/features/search/helpers/buildIndex';

/**
 * Per-locale search index at `/<lang>/search-index.json`.
 *
 * Emitted as a static file at build time and fetched by the browser only
 * when a reader actually touches the search box — it is the largest thing
 * this site serves, and most visits never search.
 *
 * Staleness takes care of itself: the service worker caches same-origin
 * GETs cache-first, and its cache version is bumped on every build (see
 * `src/integrations/sw-manifest.ts`), so a deploy retires the old index
 * along with the old pages.
 *
 * @returns one index per supported language.
 */
export const getStaticPaths = () => SUPPORTED_LANGUAGES.map((lang) => ({ params: { lang } }));

interface Params {
  readonly lang?: string;
}

/**
 * Serialise one language's index.
 * @param context - Astro endpoint context carrying `params.lang`.
 * @returns JSON response.
 */
export const GET = async (context: APIContext) => {
  const params: Params = context.params;
  const lang = params.lang ?? DEFAULT_LANGUAGE;
  const index: SearchIndex = { lang, docs: await buildIndex(lang) };
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
