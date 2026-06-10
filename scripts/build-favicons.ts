import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { Resvg } from '@resvg/resvg-js';
import toIco from 'to-ico';

/**
 * Rasterise the master `public/favicon.svg` into the PNG and ICO
 * variants Google and Bing prefer for the SERP favicon.
 *
 * Why each size:
 * - 16, 32 — legacy browser tabs / `/favicon.ico` payload
 * - 48     — Google's documented "multiple-of-48" baseline for SERPs
 * - 192    — Android home-screen icon + Bing search results
 * - 512    — PWA install + iOS home-screen
 *
 * The script is idempotent: it re-renders only when the source SVG
 * is newer than every output (mtime gate). Hook into `prebuild` so
 * a clean checkout always lands with up-to-date raster assets.
 */
const PUBLIC_DIR = resolve('public');
const SOURCE = `${PUBLIC_DIR}/favicon.svg`;
const SIZES = [16, 32, 48, 192, 512] as const;
const ICO_PATH = `${PUBLIC_DIR}/favicon.ico`;
const ICO_SIZES = [16, 32, 48] as const;

const log = (msg: string): void => {
  process.stdout.write(`[build-favicons] ${msg}\n`);
};

const pngPath = (size: number): string => `${PUBLIC_DIR}/favicon-${size}.png`;

const mtimeOrZero = (path: string): number => {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
};

const sourceIsFresh = (): boolean => {
  const sourceMtime = mtimeOrZero(SOURCE);
  const outputs = [...SIZES.map(pngPath), ICO_PATH];
  return outputs.every((p) => mtimeOrZero(p) >= sourceMtime);
};

const renderPng = (svg: Buffer, size: number): Buffer => {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  return resvg.render().asPng();
};

const main = async (): Promise<void> => {
  if (sourceIsFresh()) {
    log('all outputs newer than source — skip');
    return;
  }
  const svg = readFileSync(SOURCE);
  for (const size of SIZES) {
    const png = renderPng(svg, size);
    writeFileSync(pngPath(size), png);
    log(`wrote favicon-${size}.png (${png.byteLength} B)`);
  }
  const ico = await toIco(ICO_SIZES.map((s) => readFileSync(pngPath(s))));
  writeFileSync(ICO_PATH, ico);
  log(`wrote favicon.ico (${ico.byteLength} B, ${ICO_SIZES.join('/')})`);
};

await main();
