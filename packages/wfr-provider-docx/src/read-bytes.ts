import type { FileSource } from '@web-file-reader/core';

/** Resolve the raw bytes of a file source, regardless of how it is stored. */
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
