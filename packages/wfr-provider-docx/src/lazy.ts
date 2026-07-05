import DOMPurify from 'dompurify';
import { unzipSync } from 'fflate';
import {
  defaultsFromSchema,
  type FileDescriptor,
  type ProviderModule,
  type ProviderSettings,
  type SettingsSchema,
  type ViewerContent,
} from '@web-file-reader/core';
import { documentXmlToHtml } from './convert';
import { escapeHtml } from './escape-html';
import { readBytes } from './read-bytes';

/** Declarative settings exposed in the viewer's settings panel. */
export const settingsSchema: SettingsSchema = [
  {
    kind: 'select',
    key: 'view',
    label: 'View',
    default: 'rendered',
    options: [
      { value: 'rendered', label: 'Rendered' },
      { value: 'source', label: 'XML source' },
    ],
  },
];

/** Complete defaults derived from {@link settingsSchema}. */
export const defaultSettings: ProviderSettings = defaultsFromSchema(settingsSchema);

const readString = (settings: ProviderSettings, key: string, fallback: string): string => {
  const value = settings[key];
  return typeof value === 'string' ? value : fallback;
};

/** Extract `word/document.xml` from the DOCX (zip) bytes as text. */
const readDocumentXml = (bytes: Uint8Array): string => {
  const files = unzipSync(bytes);
  const entry = files['word/document.xml'];
  if (entry === undefined) throw new Error('DOCX has no word/document.xml.');
  return new TextDecoder().decode(entry);
};

const toHtml = (xml: string, settings: ProviderSettings): string => {
  if (readString(settings, 'view', 'rendered') === 'source') {
    return `<pre><code>${escapeHtml(xml)}</code></pre>`;
  }
  return DOMPurify.sanitize(documentXmlToHtml(xml));
};

const render = (file: FileDescriptor, settings: ProviderSettings): Promise<ViewerContent> =>
  readBytes(file.source).then((bytes) => {
    const xml = readDocumentXml(bytes);
    return { kind: 'single', page: { id: 'docx', content: { kind: 'html', html: toHtml(xml, settings) } } };
  });

/** The heavy provider module, imported lazily by the descriptor. */
export const module: ProviderModule = { settingsSchema, defaultSettings, render };
