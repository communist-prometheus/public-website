import type { FileSource } from '@web-file-reader/core';

/** A usable `<img>` src together with the cleanup that releases it. */
export interface ImageSource {
  /** Value to assign to `img.src`. */
  readonly url: string;
  /** Release any resource backing {@link ImageSource.url} (object URL). */
  readonly revoke: () => void;
}

const noop = (): void => {};

/** Wrap an object URL created from a blob/byte source with its revoker. */
const fromBlob = (blob: Blob): ImageSource => {
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
};

/** Copy bytes into a fresh ArrayBuffer-backed buffer accepted by Blob. */
const bytesToBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

/** Build an inline SVG data URL from raw markup. */
const fromSvgText = (text: string): ImageSource => ({
  url: `data:image/svg+xml,${encodeURIComponent(text)}`,
  revoke: noop,
});

/**
 * Turn a {@link FileSource} into a value usable as an `<img>` `src`.
 *
 * - `url`   — used directly; nothing to revoke.
 * - `blob`  — object URL over the blob.
 * - `bytes` — object URL over a blob wrapping the bytes.
 * - `text`  — treated as SVG markup and inlined as a data URL.
 */
export const toImageSource = (source: FileSource): ImageSource => {
  switch (source.kind) {
    case 'url':
      return { url: source.url, revoke: noop };
    case 'blob':
      return fromBlob(source.blob);
    case 'bytes':
      return fromBlob(new Blob([bytesToBuffer(source.bytes)]));
    case 'text':
      return fromSvgText(source.text);
  }
};
