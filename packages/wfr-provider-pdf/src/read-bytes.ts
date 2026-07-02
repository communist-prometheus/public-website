import type { FileSource } from '@web-file-reader/core';

/**
 * Resolve the raw bytes of a file source, regardless of how the content is
 * stored. Every {@link FileSource} kind is handled so the renderer can stay
 * source-agnostic and pdf.js always receives a `Uint8Array`.
 *
 * - `bytes` — returned as-is.
 * - `blob`  — read through its `ArrayBuffer`.
 * - `url`   — fetched, then read through its `ArrayBuffer`.
 * - `text`  — UTF-8 encoded.
 */
export const readBytes = async (source: FileSource): Promise<Uint8Array> => {
  switch (source.kind) {
    case 'bytes':
      return source.bytes;
    case 'blob':
      return new Uint8Array(await source.blob.arrayBuffer());
    case 'url': {
      const response = await fetch(source.url);
      return new Uint8Array(await response.arrayBuffer());
    }
    case 'text':
      return new TextEncoder().encode(source.text);
  }
};
