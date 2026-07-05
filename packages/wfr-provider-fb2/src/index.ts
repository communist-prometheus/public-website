import type { FileDescriptor, ProviderDescriptor, ProviderModule } from '@web-file-reader/core';
import { fileExtension } from '@web-file-reader/core';

const handledExtensions: ReadonlySet<string> = new Set(['fb2']);
const handledMimeTypes: ReadonlySet<string> = new Set([
  'application/x-fictionbook+xml',
  'application/fb2',
]);

/** Cheap predicate: `.fb2` extension or a known FictionBook MIME type. */
const canHandle = (file: FileDescriptor): boolean => {
  const extension = fileExtension(file);
  const byExtension = extension !== undefined && handledExtensions.has(extension);
  const byMime = file.mimeType !== undefined && handledMimeTypes.has(file.mimeType);
  return byExtension || byMime;
};

/** Lazily import the heavy renderer module — never at module scope. */
const load = (): Promise<ProviderModule> => import('./lazy').then((m) => m.module);

/** Eagerly-registered, dependency-free FB2 provider descriptor. */
export const descriptor: ProviderDescriptor = {
  id: 'fb2',
  name: 'FictionBook',
  priority: 1,
  canHandle,
  load,
};
