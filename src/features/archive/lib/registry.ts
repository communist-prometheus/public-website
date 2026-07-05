import { createProviderRegistry, type ProviderRegistry } from '@web-file-reader/core';
import { descriptor as archive } from '@web-file-reader/provider-archive';
import { descriptor as csv } from '@web-file-reader/provider-csv';
import { descriptor as docx } from '@web-file-reader/provider-docx';
import { descriptor as fb2 } from '@web-file-reader/provider-fb2';
import { descriptor as image } from '@web-file-reader/provider-image';
import { descriptor as markdown } from '@web-file-reader/provider-markdown';
import { descriptor as pdf } from '@web-file-reader/provider-pdf';

let cached: ProviderRegistry | undefined;

/**
 * Shared provider registry used by the archive viewer. Only the lightweight
 * descriptors are imported here; each provider's heavy renderer is downloaded
 * lazily on first use and cached inside the registry.
 */
export const getRegistry = (): ProviderRegistry => {
  if (cached !== undefined) return cached;
  const registry = createProviderRegistry();
  for (const descriptor of [markdown, image, pdf, csv, fb2, docx, archive]) {
    registry.register(descriptor);
  }
  cached = registry;
  return registry;
};
