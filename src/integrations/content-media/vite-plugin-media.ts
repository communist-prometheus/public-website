import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const MEDIA_EXTENSIONS = new Set(['.mp4', '.webm', '.ogg', '.m4a', '.mp3', '.wav']);

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const MEDIA_OUTPUT_BASE = '_media';
const CONTENT_DIR = resolve('src/content');

interface MediaEntry {
  readonly outputPath: string;
  readonly sourcePath: string;
}

const scanMediaFiles = (): ReadonlyArray<MediaEntry> => {
  const entries: MediaEntry[] = [];

  if (!existsSync(CONTENT_DIR)) return entries;

  for (const collection of readdirSync(CONTENT_DIR)) {
    const collectionDir = join(CONTENT_DIR, collection);
    if (!statSync(collectionDir).isDirectory()) continue;

    for (const item of readdirSync(collectionDir)) {
      const assetsDir = join(collectionDir, item, 'assets');
      if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) continue;

      for (const file of readdirSync(assetsDir)) {
        if (MEDIA_EXTENSIONS.has(extname(file).toLowerCase())) {
          entries.push({
            outputPath: `${MEDIA_OUTPUT_BASE}/${item}/${file}`,
            sourcePath: join(assetsDir, file),
          });
        }
      }
    }
  }

  return entries;
};

const resolveMediaPath = (url: string): string | undefined => {
  const parts = url.slice(`/${MEDIA_OUTPUT_BASE}/`.length).split('/');
  if (parts.length < 2) return undefined;

  const slug = parts.at(0);
  const fileName = parts.slice(1).join('/');
  if (!slug || !fileName) return undefined;

  if (!existsSync(CONTENT_DIR)) return undefined;

  for (const collection of readdirSync(CONTENT_DIR)) {
    const filePath = join(CONTENT_DIR, collection, slug, 'assets', fileName);
    if (existsSync(filePath)) return filePath;
  }

  return undefined;
};

const vitePluginMedia = (): Plugin => ({
  name: 'content-media',

  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url;
      if (!url?.startsWith(`/${MEDIA_OUTPUT_BASE}/`)) return next();

      const filePath = resolveMediaPath(url);
      if (!filePath) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const ext = extname(filePath).toLowerCase();
      const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
      const stat = statSync(filePath);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      createReadStream(filePath).pipe(res);
    });
  },

  generateBundle() {
    for (const entry of scanMediaFiles()) {
      this.emitFile({
        type: 'asset',
        fileName: entry.outputPath,
        source: readFileSync(entry.sourcePath),
      });
    }
  },
});

export default vitePluginMedia;
