import type { FileDescriptor, ProviderDescriptor, ProviderModule } from '@web-file-reader/core';
import { fileExtension } from '@web-file-reader/core';

/** Cheap predicate: a `pdf` extension or an `application/pdf` MIME type. */
const canHandle = (file: FileDescriptor): boolean =>
  fileExtension(file) === 'pdf' || file.mimeType === 'application/pdf';

/** Lazily import the heavy renderer module — never at module scope. */
const load = (): Promise<ProviderModule> => import('./lazy').then((m) => m.module);

/** Eagerly-registered, dependency-free PDF provider descriptor. */
export const descriptor: ProviderDescriptor = {
  id: 'pdf',
  name: 'PDF',
  priority: 1,
  canHandle,
  load,
};
