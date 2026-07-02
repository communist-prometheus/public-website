import type {
  FileDescriptor,
  PageContent,
  ProviderModule,
  ProviderSettings,
  SettingsSchema,
  ViewerContent,
  ViewerPage,
} from '@web-file-reader/core';
import { defaultsFromSchema } from '@web-file-reader/core';
import { buildTableHtml } from './build-table-html';
import { resolveDelimiter } from './delimiter';
import { parseDelimited } from './parse-csv';
import { readText } from './read-text';

const settingsSchema: SettingsSchema = [
  {
    kind: 'select',
    key: 'delimiter',
    label: 'Delimiter',
    default: 'auto',
    options: [
      { value: 'auto', label: 'Auto-detect' },
      { value: 'comma', label: 'Comma (,)' },
      { value: 'semicolon', label: 'Semicolon (;)' },
      { value: 'tab', label: 'Tab' },
      { value: 'pipe', label: 'Pipe (|)' },
    ],
  },
  { kind: 'boolean', key: 'header', label: 'First row is header', default: true },
  {
    kind: 'number',
    key: 'rowsPerPage',
    label: 'Rows per page (0 = single page)',
    default: 0,
    min: 0,
    max: 1000,
    step: 10,
  },
];

const defaultSettings: ProviderSettings = defaultsFromSchema(settingsSchema);

const readString = (settings: ProviderSettings, key: string, fallback: string): string => {
  const value = settings[key];
  return typeof value === 'string' ? value : fallback;
};

const readBoolean = (settings: ProviderSettings, key: string, fallback: boolean): boolean => {
  const value = settings[key];
  return typeof value === 'boolean' ? value : fallback;
};

const readNumber = (settings: ProviderSettings, key: string, fallback: number): number => {
  const value = settings[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

/** Split parsed rows into an optional header row and the remaining body rows. */
const splitRows = (
  rows: readonly (readonly string[])[],
  header: boolean,
): {
  readonly headerRow: readonly string[] | undefined;
  readonly bodyRows: readonly (readonly string[])[];
} =>
  header && rows.length > 0
    ? { headerRow: rows[0], bodyRows: rows.slice(1) }
    : { headerRow: undefined, bodyRows: rows };

const htmlContent = (html: string): PageContent => ({ kind: 'html', html });

/** Split body rows into fixed-size chunks for pagination. */
const chunk = (
  rows: readonly (readonly string[])[],
  size: number,
): readonly (readonly (readonly string[])[])[] => {
  const pages: (readonly (readonly string[])[])[] = [];
  let offset = 0;
  while (offset < rows.length) {
    pages.push(rows.slice(offset, offset + size));
    offset += size;
  }
  return pages;
};

const singlePage = (
  headerRow: readonly string[] | undefined,
  bodyRows: readonly (readonly string[])[],
): ViewerContent => ({
  kind: 'single',
  page: { id: 'page-1', content: htmlContent(buildTableHtml(headerRow, bodyRows)) },
});

const buildPage = (
  headerRow: readonly string[] | undefined,
  pageRows: readonly (readonly string[])[],
  pageIndex: number,
  rowsPerPage: number,
): ViewerPage => {
  const firstRow = pageIndex * rowsPerPage + 1;
  const lastRow = firstRow + pageRows.length - 1;
  return {
    id: `page-${pageIndex + 1}`,
    label: `Rows ${firstRow}–${lastRow}`,
    content: htmlContent(buildTableHtml(headerRow, pageRows)),
  };
};

const multiPage = (
  headerRow: readonly string[] | undefined,
  bodyRows: readonly (readonly string[])[],
  rowsPerPage: number,
): ViewerContent => ({
  kind: 'multi',
  pages: chunk(bodyRows, rowsPerPage).map((pageRows, pageIndex) =>
    buildPage(headerRow, pageRows, pageIndex, rowsPerPage),
  ),
});

const toContent = (
  headerRow: readonly string[] | undefined,
  bodyRows: readonly (readonly string[])[],
  rowsPerPage: number,
): ViewerContent =>
  rowsPerPage > 0
    ? multiPage(headerRow, bodyRows, rowsPerPage)
    : singlePage(headerRow, bodyRows);

const render = async (
  file: FileDescriptor,
  settings: ProviderSettings,
): Promise<ViewerContent> => {
  const text = await readText(file.source);
  const delimiter = resolveDelimiter(readString(settings, 'delimiter', 'auto'), text);
  const rows = parseDelimited(text, delimiter);
  const { headerRow, bodyRows } = splitRows(rows, readBoolean(settings, 'header', true));
  const rowsPerPage = readNumber(settings, 'rowsPerPage', 0);
  return toContent(headerRow, bodyRows, rowsPerPage);
};

/** Heavy CSV provider module — loaded lazily by the descriptor. */
export const module: ProviderModule = {
  settingsSchema,
  defaultSettings,
  render,
};
