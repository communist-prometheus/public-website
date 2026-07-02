import type { FileDescriptor, ProviderDescriptor, ProviderModule } from '@web-file-reader/core';
import { fileExtension } from '@web-file-reader/core';

const handledExtensions: ReadonlySet<string> = new Set(['zip']);
const handledMimeTypes: ReadonlySet<string> = new Set([
  'application/zip',
  'application/x-zip-compressed',
]);

/** Cheap predicate: `.zip` extension or a known ZIP MIME type. */
const canHandle = (file: FileDescriptor): boolean => {
  const extension = fileExtension(file);
  const byExtension = extension !== undefined && handledExtensions.has(extension);
  const byMime = file.mimeType !== undefined && handledMimeTypes.has(file.mimeType);
  return byExtension || byMime;
};

/** Lazily import the heavy renderer module — never at module scope. */
const load = (): Promise<ProviderModule> => import('./lazy').then((m) => m.module);

/** Eagerly-registered, dependency-free ZIP archive provider descriptor. */
export const descriptor: ProviderDescriptor = {
  id: 'archive',
  name: 'Archive',
  priority: 1,
  canHandle,
  load,
};
