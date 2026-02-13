import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { AstroIntegration } from 'astro';

const collectHtmlRoutes = (dir: string, base: string = dir): string[] => {
  const routes: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      routes.push(...collectHtmlRoutes(full, base));
    } else if (entry === 'index.html') {
      const rel = `/${relative(base, dir).replace(/\\/g, '/')}`;
      routes.push(rel === '/' ? '/' : `${rel}/`);
    }
  }

  return routes;
};

const swManifest = (): AstroIntegration => ({
  name: 'sw-manifest',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const distPath = dir.pathname.replace(/^\/([A-Z]:)/, '$1');
      const swPath = join(distPath, 'sw.js');

      const routes = collectHtmlRoutes(distPath);
      const version = Date.now().toString(36);

      let sw = readFileSync(swPath, 'utf-8');
      sw = sw.replace("'__PRECACHE_URLS__'", JSON.stringify(routes));
      sw = sw.replace('__CACHE_VERSION__', version);

      writeFileSync(swPath, sw, 'utf-8');

      console.log(`[sw-manifest] Injected ${routes.length} routes, version ${version}`);
    },
  },
});

export default swManifest;
