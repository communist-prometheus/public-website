import type { FileDescriptor, ProviderDescriptor, ProviderModule } from '@web-file-reader/core';
import { fileExtension } from '@web-file-reader/core';

const handledExtensions: ReadonlySet<string> = new Set(['csv', 'tsv']);
const handledMimeTypes: ReadonlySet<string> = new Set([
  'text/csv',
  'text/tab-separated-values',
]);

const canHandle = (file: FileDescriptor): boolean => {
  const extension = fileExtension(file);
  const byExtension = extension !== undefined && handledExtensions.has(extension);
  const byMime = file.mimeType !== undefined && handledMimeTypes.has(file.mimeType);
  return byExtension || byMime;
};

const load = (): Promise<ProviderModule> => import('./lazy').then((m) => m.module);

/** Eagerly-registered CSV / TSV provider descriptor. */
export const descriptor: ProviderDescriptor = {
  id: 'csv',
  name: 'CSV',
  priority: 1,
  canHandle,
  load,
};
