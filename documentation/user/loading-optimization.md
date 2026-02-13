# Loading & Caching Optimization

## Architecture

Static site (Astro SSG) + Service Worker + ClientRouter SPA navigation.

```
Browser → SW cache (instant) → Network (background refresh)
                ↓
         14 precached HTML routes
         Static assets cached on first visit
```

## Service Worker

### Files

| File | Role |
|------|------|
| `src/sw/sw.ts` | Service Worker source (TypeScript) |
| `src/sw/tsconfig.json` | Dedicated tsconfig with `WebWorker` lib |
| `src/integrations/sw-manifest.ts` | Astro build integration — compiles SW, injects routes + cache version |

### Strategies

| Request type | Strategy | Behavior |
|---|---|---|
| HTML pages (`navigate`, `text/html`) | Stale-while-revalidate | Instant from cache, background network refresh |
| Static assets (JS, CSS, images) | Cache-first | Serve from cache, network only on miss |
| Cross-origin / non-GET | Passthrough | No caching |

### Precaching

On `install`, the SW precaches all known HTML routes (currently 14 pages). Routes are collected at build time by scanning `dist/` for `index.html` files.

### Cache Versioning

- Cache name: `prometheus-v{version}`
- Version = `Date.now().toString(36)` — generated at build time
- On `activate`, old `prometheus-*` caches are purged
- `skipWaiting()` + `clients.claim()` ensure immediate takeover

### Build Integration (`sw-manifest.ts`)

Runs in `astro:build:done` hook:

1. Compiles `src/sw/sw.ts` → `dist/sw.js` via esbuild (bundled, minified, IIFE, ES2022)
2. Scans `dist/` for HTML routes
3. Replaces `"__PRECACHE_URLS__"` placeholder with route array
4. Replaces `__CACHE_VERSION__` placeholder with timestamp

### Registration

```html
<!-- BaseLayout.astro -->
<script is:inline>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

## ClientRouter (SPA Navigation)

`<ClientRouter />` from `astro:transitions` intercepts link clicks and performs client-side navigation:

- Fetches new page HTML via `fetch()`
- Diffs and swaps only changed DOM
- Header and footer persist (`transition:persist`) — no re-render, no re-fetch
- Combined with SW: navigation fetches hit SW cache → instant response → no network waterfall

### Result

| Scenario | Latency |
|---|---|
| First visit | Network (SW installs, precaches in background) |
| Subsequent page load | SW cache (instant), background refresh |
| SPA navigation | ClientRouter fetch → SW cache → instant swap |
| Offline | Full site available from SW cache |

## Constraints

- SW source uses `WebWorker` lib — root `tsconfig.json` excludes `src/sw/` to avoid DOM/WebWorker conflicts
- `sw.ts` is compiled by esbuild, not tsc — type checking is separate from compilation
- Precache list is static (build-time) — dynamic routes require rebuild
