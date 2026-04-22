const MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

const capture = (block: string, key: string): string | undefined => {
  const match = block.match(new RegExp(`^${key}:\\s*(\\S.*?)\\s*$`, 'm'));
  return match?.[1];
};

const removeLine = (block: string, key: string): string =>
  block.replace(new RegExp(`^${key}:.*\\r?\\n?`, 'm'), '');

const appendLine = (block: string, line: string): string => {
  const trimmed = block.replace(/\s+$/, '');
  return `${trimmed}\n${line}`;
};

/**
 * Drop `pubDate` from frontmatter. If `publishDate` is missing, first
 * copy `pubDate`'s value into `publishDate` so historical sort order
 * is preserved.
 *
 * @param source raw markdown file contents
 * @returns the new source, or undefined when no change is needed
 */
export const migrate = (source: string): string | undefined => {
  const match = source.match(MATTER);
  const block = match?.[1];
  if (block === undefined) return undefined;
  const pub = capture(block, 'pubDate');
  if (pub === undefined) return undefined;
  let next = removeLine(block, 'pubDate');
  if (capture(next, 'publishDate') === undefined) {
    next = appendLine(next, `publishDate: ${pub}`);
  }
  return source.replace(match?.[0] ?? '', `---\n${next}\n---`);
};
