/**
 * Pure delimited-text parsing helpers (CSV / TSV / …). No external deps —
 * a small hand-rolled state machine that honours RFC-4180-style quoting.
 */

/** The candidate delimiters {@link detectDelimiter} chooses among. */
const candidateDelimiters: readonly string[] = [',', ';', '\t', '|'];

const quote = '"';
const carriageReturn = '\r';
const newline = '\n';

/**
 * Parse delimited text into a matrix of string cells.
 *
 * Handles quoted fields containing the delimiter or newlines, escaped quotes
 * (`""` → `"`), both CRLF and LF line endings, and a trailing newline (which
 * does not produce a spurious empty final row).
 */
export const parseDelimited = (
  text: string,
  delimiter: string,
): readonly (readonly string[])[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let cellStarted = false;

  const pushField = (): void => {
    row.push(field);
    field = '';
    cellStarted = false;
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  let index = 0;
  while (index < text.length) {
    const char = text[index];
    switch (inQuotes) {
      case true:
        switch (char === quote) {
          case true:
            switch (text[index + 1] === quote) {
              case true:
                field += quote;
                index += 2;
                break;
              default:
                inQuotes = false;
                index += 1;
            }
            break;
          default:
            field += char;
            index += 1;
        }
        break;
      default:
        switch (char) {
          case quote:
            inQuotes = true;
            cellStarted = true;
            index += 1;
            break;
          case delimiter:
            pushField();
            index += 1;
            break;
          case carriageReturn:
            pushRow();
            index += text[index + 1] === newline ? 2 : 1;
            break;
          case newline:
            pushRow();
            index += 1;
            break;
          default:
            field += char;
            cellStarted = true;
            index += 1;
        }
    }
  }

  // Flush the final field/row unless the input ended exactly on a row break.
  switch (field.length > 0 || cellStarted || row.length > 0) {
    case true:
      pushRow();
      break;
    default:
      break;
  }

  return rows;
};

/** Number of times `char` appears in `line`. */
const countOccurrences = (line: string, char: string): number =>
  line.split(char).length - 1;

/** Extract the first physical line (up to the first LF/CRLF) of `text`. */
const firstLine = (text: string): string => {
  const breakIndex = text.search(/\r\n|\n|\r/);
  return breakIndex === -1 ? text : text.slice(0, breakIndex);
};

/**
 * Pick the most likely delimiter by counting candidate occurrences in the first
 * line. Falls back to a comma when nothing is found.
 */
export const detectDelimiter = (text: string): string => {
  const line = firstLine(text);
  const ranked = candidateDelimiters
    .map((delimiter) => ({ delimiter, count: countOccurrences(line, delimiter) }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);
  const best = ranked[0];
  return best === undefined ? ',' : best.delimiter;
};
