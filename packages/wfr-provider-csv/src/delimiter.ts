import { detectDelimiter } from './parse-csv';

const fixedDelimiters: ReadonlyMap<string, string> = new Map([
  ['comma', ','],
  ['semicolon', ';'],
  ['tab', '\t'],
  ['pipe', '|'],
]);

/**
 * Resolve a settings option to an actual delimiter character. `auto` (and any
 * unknown value) defers to {@link detectDelimiter}.
 */
export const resolveDelimiter = (option: string, text: string): string => {
  const fixed = fixedDelimiters.get(option);
  return fixed === undefined ? detectDelimiter(text) : fixed;
};
