import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

interface IssueAsset {
  readonly file: string;
  readonly size: number;
}

interface IssueAssetWithPath extends IssueAsset {
  readonly url: string;
}

const findOne = (dir: string, ext: string): IssueAsset | undefined => {
  if (!existsSync(dir)) return undefined;
  const file = readdirSync(dir).find((f) => f.toLowerCase().endsWith(ext));
  if (file === undefined) return undefined;
  return { file, size: statSync(resolve(dir, file)).size };
};

/**
 * Locate the first file inside a newspaper issue's `assets/` dir that
 * has the given extension. Returns the file's basename, byte size,
 * and its served URL — the public site's links can read this without
 * caring whether the editor named the file `<slug>.pdf`, `gazette.pdf`,
 * or `Magazine1 (3).pdf`.
 *
 * @param slug - Issue slug (also the directory name)
 * @param ext - File extension to look for, including the leading dot
 * @returns Asset descriptor with served URL, or undefined when missing
 */
export const findIssueAsset = (slug: string, ext: string): IssueAssetWithPath | undefined => {
  const dir = resolve(`src/content/newspaper/${slug}/assets`);
  const found = findOne(dir, ext);
  if (found === undefined) return undefined;
  return {
    ...found,
    url: `/newspaper/${slug}/assets/${found.file}`,
  };
};
