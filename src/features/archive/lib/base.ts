/*
 * Archive-viewer base URL helper.
 *
 * The reference wfr-host uses `withBase('viewer/<id>')` to build absolute
 * URLs under a static site base. Our archive lives at
 * `/{lang}/archive/{slug}/`, and deep-links carry the current file in the
 * hash (`#asset=<name>`) rather than a subroute — no static page explosion.
 *
 * `withBase('')` therefore resolves to the current archive page (no hash),
 * and `withBase('viewer/<id>')` maps to `<archivePage>#asset=<id>`. The
 * setup script uses these two forms only.
 *
 * SSR: `location` is unavailable during Astro rendering, so during SSR we
 * fall back to `#` — the anchor is only meaningful client-side once the
 * viewer is wired.
 */
const currentBase = (): string => (typeof location === 'undefined' ? '' : location.pathname);

/**
 * Return an absolute URL under the current archive page. Empty path → base
 * root. A `viewer/<id>` path becomes `<base>#asset=<id>` — deep-links stay
 * hash-based so no per-file static route is required.
 */
export const withBase = (path: string): string => {
  const base = currentBase();
  const rel = path.replace(/^\/+/, '');
  if (rel === '') return base === '' ? '#' : base;
  const viewerMatch = rel.match(/^viewer\/(.+?)\/?$/);
  if (viewerMatch !== null) {
    const id = viewerMatch[1] ?? '';
    return `${base}#asset=${encodeURIComponent(id)}`;
  }
  return `${base}${rel}`;
};

/** Extract the file id encoded in `location` (via `#asset=<id>`). */
export const fileIdFromLocation = (): string | undefined => {
  if (typeof location === 'undefined') return undefined;
  const match = location.hash.match(/(?:^#|&)asset=([^&]+)/);
  if (match === null) return undefined;
  const raw = match[1];
  return raw === undefined ? undefined : decodeURIComponent(raw);
};
