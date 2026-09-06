import yaml from 'js-yaml';

/** One reason a markdown file's frontmatter would fail the content build. */
export interface FrontmatterProblem {
  /** 1-based line in the FILE (not the fence); undefined when the problem has no position. */
  readonly line: number | undefined;
  readonly message: string;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Position of the parse error inside the fence, translated to a file line. */
const errorLine = (error: unknown): number | undefined => {
  if (!(error instanceof yaml.YAMLException)) return undefined;
  const line: unknown = Reflect.get(error.mark ?? {}, 'line');
  /*
   * js-yaml's mark.line is 0-based within the parsed text; the text starts on
   * file line 2 (after the opening `---`).
   */
  return typeof line === 'number' ? line + 2 : undefined;
};

const firstLine = (message: string): string => message.split('\n')[0] ?? message;

/** File line of the first `key:` line for a given top-level key, if any. */
const keyLine = (fence: string, key: string): number | undefined => {
  const index = fence.split(/\r?\n/).findIndex((l) => l.startsWith(`${key}:`));
  return index < 0 ? undefined : index + 2;
};

/*
 * A top-level key left without a value (`articles:`) is YAML's empty
 * value, which the content collection schemas reject (an optional field
 * accepts absence, never an empty value). No content field is ever
 * meant to be empty, so it is reported by name instead of surfacing
 * later as an opaque schema error.
 */
const emptyValueProblems = (fence: string, data: Record<string, unknown>): FrontmatterProblem[] =>
  Object.entries(data)
    .filter(([, value]) => value === null)
    .map(([key]) => ({
      line: keyLine(fence, key),
      message: `"${key}" has no value — remove the key or give it one (an empty list is \`${key}: []\`)`,
    }));

/**
 * Every reason the frontmatter of a markdown source would break the
 * Astro content build, in file order. Empty when the file has no fence
 * or its fence is valid.
 */
export const findFrontmatterProblems = (raw: string): readonly FrontmatterProblem[] => {
  const match = raw.match(FENCE);
  const fence = match?.[1];
  if (fence === undefined) return [];
  let data: unknown;
  try {
    data = yaml.load(fence);
  } catch (error) {
    const message = error instanceof Error ? firstLine(error.message) : String(error);
    return [{ line: errorLine(error), message }];
  }
  if (!isRecord(data))
    return [{ line: 2, message: 'frontmatter must be a mapping (key: value …)' }];
  return emptyValueProblems(fence, data);
};
