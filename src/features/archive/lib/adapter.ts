import { getImage } from 'astro:assets';
import type { FileDescriptor } from '@web-file-reader/core';
import { type ArchiveAsset, getArchiveAssets } from '@/features/archive/helpers/getArchiveItems';

/*
 * MIME map keyed by lower-case extension. Providers pick a handler from the
 * extension anyway, but wfr-core stores `mimeType` on the descriptor so
 * consumers of the file list (e.g. download attribute suggestions) can use it.
 * Missing types fall back to `application/octet-stream`.
 */
const MIME_BY_EXT: Readonly<Record<string, string>> = {
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  xml: 'application/xml',
  yml: 'application/yaml',
  yaml: 'application/yaml',
  html: 'text/html',
  log: 'text/plain',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  fb2: 'application/x-fictionbook+xml',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

/* Small enough to be a thumb yet crisp on the grid at 2x DPR. */
const THUMB_WIDTH = 320;

const mimeFromName = (name: string): string => {
  const ext = name.split('.').at(-1)?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
};

const iconForExt = (ext: string): string => {
  const lower = ext.toLowerCase();
  if (['md', 'markdown', 'txt', 'log', 'json', 'xml', 'yml', 'yaml', 'html'].includes(lower))
    return '/icons/file-md.svg';
  if (['csv', 'tsv'].includes(lower)) return '/icons/file-csv.svg';
  if (lower === 'pdf') return '/icons/file-pdf.svg';
  if (lower === 'docx' || lower === 'doc') return '/icons/file-docx.svg';
  if (lower === 'fb2') return '/icons/file-fb2.svg';
  if (lower === 'zip') return '/icons/file-zip.svg';
  return '/icons/file-txt.svg';
};

/**
 * Build a wfr {@link FileDescriptor} list from an archive album's assets.
 * Images run through Astro's image pipeline (single optimised webp thumbnail
 * — the grid tile is a fixed-size preview, not a responsive picture); other
 * files carry a static extension icon. The full asset URL is the same
 * `/archive/{slug}/assets/{name}` public URL the copy-integration writes.
 *
 * @param slug - Album slug (folder under src/content/archive).
 * @returns FileDescriptor list, in the same order as `getArchiveAssets`.
 */
export const getArchiveFileDescriptors = async (
  slug: string,
): Promise<readonly FileDescriptor[]> => {
  const assets = getArchiveAssets(slug);
  return Promise.all(assets.map((asset) => toDescriptor(asset)));
};

const toDescriptor = async (asset: ArchiveAsset): Promise<FileDescriptor> => {
  /*
   * The file id doubles as the URL hash value (`#asset=<id>`) — using the
   * bare filename keeps the deep-link human-readable and matches the
   * filenames the noscript download list advertises. Filenames are unique
   * per album by construction (single flat `assets/` directory).
   */
  const id = asset.name;
  const url = asset.downloadUrl;

  if (asset.kind === 'image') {
    // SVGs Astro cannot process → serve the raw file as the thumbnail too.
    const previewIconUrl =
      asset.image.format === 'svg'
        ? asset.image.src
        : (await getImage({ src: asset.image, width: THUMB_WIDTH, format: 'webp' })).src;
    return {
      id,
      name: asset.name,
      extension: asset.image.format,
      mimeType: mimeFromName(asset.name),
      source: { kind: 'url', url },
      previewIconUrl,
    };
  }

  return {
    id,
    name: asset.name,
    extension: asset.ext.toLowerCase(),
    mimeType: mimeFromName(asset.name),
    source: { kind: 'url', url },
    previewIconUrl: iconForExt(asset.ext),
    size: asset.sizeBytes,
  };
};
