const MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

const hasKey = (block: string, key: string): boolean => new RegExp(`^${key}:`, 'm').test(block);

/**
 * Insert `published: true` into frontmatter when missing.
 *
 * @param source raw markdown file contents
 * @returns the new source, or undefined when no change is needed
 */
export const migrate = (source: string): string | undefined => {
  const match = source.match(MATTER);
  const block = match?.[1];
  if (block === undefined) return undefined;
  if (hasKey(block, 'published')) return undefined;
  const next = `${block}\npublished: true`;
  return source.replace(match?.[0] ?? '', `---\n${next}\n---`);
};
