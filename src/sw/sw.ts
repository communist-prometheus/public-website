/**
 * Service Worker for Prometheus SSG site.
 *
 * Strategies:
 * - HTML pages: stale-while-revalidate (instant from cache, background refresh)
 * - Static assets (images, icons): cache-first
 * - All known routes are precached on install for instant navigation
 *
 * Cache versioning: CACHE_VERSION is replaced at build time by the
 * sw-manifest integration. Changing it busts the old cache.
 *
 * NOTE: This file is compiled by esbuild at build time (not by tsc).
 * The root tsconfig excludes src/sw/ to avoid DOM/WebWorker lib conflicts.
 */

export type {};

const sw = globalThis as unknown as ServiceWorkerGlobalScope;

const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `prometheus-v${CACHE_VERSION}`;

const PRECACHE_URLS: readonly string[] = '__PRECACHE_URLS__' as unknown as readonly string[];

/* ------------------------------------------------------------------ */
/*  Install — precache all known routes                               */
/* ------------------------------------------------------------------ */

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...PRECACHE_URLS]))
      .then(() => sw.skipWaiting()),
  );
});

/* ------------------------------------------------------------------ */
/*  Activate — purge old caches                                       */
/* ------------------------------------------------------------------ */

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('prometheus-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => sw.clients.claim()),
  );
});

/* ------------------------------------------------------------------ */
/*  Fetch — strategy per request type                                 */
/* ------------------------------------------------------------------ */

sw.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== sw.location.origin) return;

  const accept = request.headers.get('accept') ?? '';
  const isNavigate = request.mode === 'navigate' || accept.includes('text/html');

  event.respondWith(isNavigate ? staleWhileRevalidate(request) : cacheFirst(request));
});

/* ------------------------------------------------------------------ */
/*  Stale-while-revalidate: return cache immediately, refresh behind  */
/* ------------------------------------------------------------------ */

const staleWhileRevalidate = async (request: Request): Promise<Response> => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached ?? networkFetch;
};

/* ------------------------------------------------------------------ */
/*  Cache-first: use cache, fall back to network                      */
/* ------------------------------------------------------------------ */

const cacheFirst = async (request: Request): Promise<Response> => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
};
