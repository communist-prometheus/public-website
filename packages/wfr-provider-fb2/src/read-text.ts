import type { FileSource } from '@web-file-reader/core';

/** Resolve a file's textual content regardless of how its bytes are stored. */
export const readText = (source: FileSource): Promise<string> => {
  switch (source.kind) {
    case 'text':
      return Promise.resolve(source.text);
    case 'blob':
      return source.blob.text();
    case 'url':
      return fetch(source.url).then((response) => response.text());
    case 'bytes':
      return Promise.resolve(new TextDecoder().decode(source.bytes));
  }
};
