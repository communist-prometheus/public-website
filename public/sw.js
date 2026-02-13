/// <reference lib="webworker" />

/**
 * Service Worker for Prometheus SSG site.
 *
 * Strategies:
 * - HTML pages: stale-while-revalidate (instant from cache, background refresh)
 * - Static assets (images, icons): cache-first
 * - All known routes are precached on install for instant navigation
 *
 * Cache versioning: CACHE_VERSION is replaced at build time by the
 * generate-sw-manifest integration. Changing it busts the old cache.
 */

const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `prometheus-v${CACHE_VERSION}`;

/** @type {string[]} Populated at build time */
const PRECACHE_URLS = '__PRECACHE_URLS__';

/* ------------------------------------------------------------------ */
/*  Install — precache all known routes                               */
/* ------------------------------------------------------------------ */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

/* ------------------------------------------------------------------ */
/*  Activate — purge old caches                                       */
/* ------------------------------------------------------------------ */

self.addEventListener('activate', (event) => {
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
      .then(() => self.clients.claim()),
  );
});

/* ------------------------------------------------------------------ */
/*  Fetch — strategy per request type                                 */
/* ------------------------------------------------------------------ */

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const accept = request.headers.get('accept') || '';
  const isNavigate = request.mode === 'navigate' || accept.includes('text/html');

  event.respondWith(isNavigate ? staleWhileRevalidate(request) : cacheFirst(request));
});

/* ------------------------------------------------------------------ */
/*  Stale-while-revalidate: return cache immediately, refresh behind  */
/* ------------------------------------------------------------------ */

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || networkFetch;
}

/* ------------------------------------------------------------------ */
/*  Cache-first: use cache, fall back to network                      */
/* ------------------------------------------------------------------ */

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}
