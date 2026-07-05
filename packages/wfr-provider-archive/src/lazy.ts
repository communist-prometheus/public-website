import { unzipSync } from 'fflate';
import {
  defaultsFromSchema,
  type FileDescriptor,
  type ProviderModule,
  type ProviderSettings,
  type SettingsSchema,
  type ViewerContent,
} from '@web-file-reader/core';
import { buildListingHtml, type ArchiveEntry, type ArchiveSort } from './build-listing';
import { readBytes } from './read-bytes';

/** Declarative settings exposed in the viewer's settings panel. */
export const settingsSchema: SettingsSchema = [
  {
    kind: 'select',
    key: 'sort',
    label: 'Sort by',
    default: 'name',
    options: [
      { value: 'name', label: 'Name' },
      { value: 'size', label: 'Size' },
    ],
  },
];

/** Complete defaults derived from {@link settingsSchema}. */
export const defaultSettings: ProviderSettings = defaultsFromSchema(settingsSchema);

const readSort = (settings: ProviderSettings): ArchiveSort =>
  settings['sort'] === 'size' ? 'size' : 'name';

/** Map fflate's unzip output to entries, dropping directory placeholders. */
const toEntries = (files: Readonly<Record<string, Uint8Array>>): readonly ArchiveEntry[] =>
  Object.entries(files)
    .filter(([name]) => !name.endsWith('/'))
    .map(([name, bytes]) => ({ name, size: bytes.length }));

const render = (file: FileDescriptor, settings: ProviderSettings): Promise<ViewerContent> =>
  readBytes(file.source).then((bytes) => {
    const entries = toEntries(unzipSync(bytes));
    const html = buildListingHtml(entries, readSort(settings));
    return { kind: 'single', page: { id: 'archive', content: { kind: 'html', html } } };
  });

/** The heavy provider module, imported lazily by the descriptor. */
export const module: ProviderModule = { settingsSchema, defaultSettings, render };
