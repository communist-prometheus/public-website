import { escapeHtml } from './escape-html';

/** Render a sequence of `<td>` cells for one body row. */
const bodyCells = (cells: readonly string[]): string =>
  cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('');

/** Render a sequence of `<th scope="col">` header cells. */
const headerCells = (cells: readonly string[]): string =>
  cells.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join('');

const renderThead = (headerRow: readonly string[] | undefined): string =>
  headerRow === undefined ? '' : `<thead><tr>${headerCells(headerRow)}</tr></thead>`;

const renderTbody = (bodyRows: readonly (readonly string[])[]): string =>
  `<tbody>${bodyRows.map((cells) => `<tr>${bodyCells(cells)}</tr>`).join('')}</tbody>`;

/**
 * Build an accessible `<table>` string. When `headerRow` is provided it becomes
 * a `<thead>` with column-scoped headers; the body rows always become `<tbody>`.
 * Every cell value is HTML-escaped before insertion.
 */
export const buildTableHtml = (
  headerRow: readonly string[] | undefined,
  bodyRows: readonly (readonly string[])[],
): string => `<table>${renderThead(headerRow)}${renderTbody(bodyRows)}</table>`;
