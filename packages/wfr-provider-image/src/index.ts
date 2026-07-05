import type { FileDescriptor, ProviderDescriptor, ProviderModule } from '@web-file-reader/core';
import { fileExtension } from '@web-file-reader/core';

/** File extensions handled by this provider. */
const imageExtensions: ReadonlySet<string> = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'svg',
  'bmp',
  'ico',
]);

/** Cheap predicate: known image extension or an `image/*` MIME type. */
const canHandle = (file: FileDescriptor): boolean => {
  const extension = fileExtension(file);
  const byExtension = extension !== undefined && imageExtensions.has(extension);
  const byMime = file.mimeType?.startsWith('image/') ?? false;
  return byExtension || byMime;
};

/** Lazily import the heavy renderer module — never at module scope. */
const load = (): Promise<ProviderModule> => import('./lazy').then((m) => m.module);

/** Eagerly-registered, dependency-free image provider descriptor. */
export const descriptor: ProviderDescriptor = {
  id: 'image',
  name: 'Image',
  priority: 1,
  canHandle,
  load,
};
