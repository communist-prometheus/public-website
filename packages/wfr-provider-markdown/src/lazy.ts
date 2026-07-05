import DOMPurify from 'dompurify';
import { marked } from 'marked';
import {
  defaultsFromSchema,
  type FileDescriptor,
  type ProviderModule,
  type ProviderSettings,
  type SettingsSchema,
  type ViewerContent,
} from '@web-file-reader/core';
import { escapeHtml } from './escape-html';
import { readText } from './read-text';

/** Declarative settings exposed in the viewer's settings panel. */
export const settingsSchema: SettingsSchema = [
  { kind: 'boolean', key: 'gfm', label: 'GitHub Flavored Markdown', default: true },
  { kind: 'boolean', key: 'breaks', label: 'Convert line breaks', default: false },
  {
    kind: 'select',
    key: 'view',
    label: 'View',
    default: 'rendered',
    options: [
      { value: 'rendered', label: 'Rendered' },
      { value: 'source', label: 'Source' },
    ],
  },
];

const defaultSettings: ProviderSettings = defaultsFromSchema(settingsSchema);

const asBoolean = (value: ProviderSettings[string] | undefined): boolean =>
  typeof value === 'boolean' ? value : false;

/** Render markdown to sanitized HTML using the GFM/breaks options. */
const renderMarkdown = (text: string, settings: ProviderSettings): string =>
  DOMPurify.sanitize(
    marked.parse(text, {
      gfm: asBoolean(settings.gfm),
      breaks: asBoolean(settings.breaks),
      async: false,
    }),
  );

/** Render the raw source inside an escaped, non-executable code block. */
const renderSource = (text: string): string =>
  `<pre><code>${escapeHtml(text)}</code></pre>`;

const toHtml = (text: string, settings: ProviderSettings): string =>
  settings.view === 'source' ? renderSource(text) : renderMarkdown(text, settings);

const render = (
  file: FileDescriptor,
  settings: ProviderSettings,
): Promise<ViewerContent> =>
  readText(file.source).then((text) => ({
    kind: 'single',
    page: { id: 'markdown', content: { kind: 'html', html: toHtml(text, settings) } },
  }));

/** Heavy provider module — pulled in only behind the descriptor's lazy load. */
export const module: ProviderModule = { settingsSchema, defaultSettings, render };
