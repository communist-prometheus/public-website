import DOMPurify from 'dompurify';
import {
  defaultsFromSchema,
  type FileDescriptor,
  type ProviderModule,
  type ProviderSettings,
  type SettingsSchema,
  type ViewerContent,
  type ViewerPage,
} from '@web-file-reader/core';
import { fb2ToPages, type Fb2Page } from './convert';
import { readText } from './read-text';

/** Declarative settings exposed in the viewer's settings panel. */
export const settingsSchema: SettingsSchema = [
  {
    kind: 'select',
    key: 'pages',
    label: 'Pages',
    default: 'section',
    options: [
      { value: 'section', label: 'One per section' },
      { value: 'single', label: 'Single page' },
    ],
  },
];

/** Complete defaults derived from {@link settingsSchema}. */
export const defaultSettings: ProviderSettings = defaultsFromSchema(settingsSchema);

const readString = (settings: ProviderSettings, key: string, fallback: string): string => {
  const value = settings[key];
  return typeof value === 'string' ? value : fallback;
};

/** Sanitize a page's HTML; FB2 content is untrusted document data. */
const sanitize = (html: string): string => DOMPurify.sanitize(html);

const toViewerPage = (page: Fb2Page): ViewerPage => ({
  id: page.id,
  label: page.label,
  content: { kind: 'html', html: sanitize(page.html) },
});

/** Collapse all sections into one scrollable page. */
const toSingle = (pages: readonly Fb2Page[]): ViewerContent => ({
  kind: 'single',
  page: {
    id: 'fb2',
    content: { kind: 'html', html: sanitize(pages.map((p) => p.html).join('\n')) },
  },
});

const render = (file: FileDescriptor, settings: ProviderSettings): Promise<ViewerContent> =>
  readText(file.source).then((text) => {
    const pages = fb2ToPages(text);
    if (readString(settings, 'pages', 'section') === 'single') return toSingle(pages);
    return { kind: 'multi', pages: pages.map(toViewerPage) };
  });

/** The heavy provider module, imported lazily by the descriptor. */
export const module: ProviderModule = { settingsSchema, defaultSettings, render };
