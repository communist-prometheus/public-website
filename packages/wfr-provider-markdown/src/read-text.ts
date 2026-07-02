import type { FileSource } from '@web-file-reader/core';

/**
 * Resolve the textual content of a file source, regardless of how the bytes are
 * stored. Every {@link FileSource} kind is handled so the renderer can stay
 * source-agnostic.
 */
export const readText = (source: FileSource): Promise<string> => {
  switch (source.kind) {
    case 'text':
      return Promise.resolve(source.text);
    case 'url':
      return fetch(source.url).then((response) => response.text());
    case 'blob':
      return source.blob.text();
    case 'bytes':
      return Promise.resolve(new TextDecoder().decode(source.bytes));
  }
};
