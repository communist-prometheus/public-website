import {
  fileExtension,
  type FileDescriptor,
  type ProviderDescriptor,
  type ProviderModule,
} from '@web-file-reader/core';

export type { ProviderModule };

/** Extensions this provider claims as text/markdown content. */
const extensions: ReadonlySet<string> = new Set(['md', 'markdown', 'txt', 'text']);

/** MIME types this provider claims. */
const mimeTypes: ReadonlySet<string> = new Set(['text/markdown', 'text/plain']);

const canHandle = (file: FileDescriptor): boolean => {
  const extension = fileExtension(file);
  const byExtension = extension !== undefined && extensions.has(extension);
  const byMime = file.mimeType !== undefined && mimeTypes.has(file.mimeType);
  return byExtension || byMime;
};

const load = (): Promise<ProviderModule> => import('./lazy').then((m) => m.module);

/** Cheap descriptor — registers eagerly without pulling in the parser. */
export const descriptor: ProviderDescriptor = {
  id: 'markdown',
  name: 'Markdown',
  priority: 1,
  canHandle,
  load,
};
