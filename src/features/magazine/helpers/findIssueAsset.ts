import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { magazineContentDir } from './contentDir';

interface IssueAsset {
  readonly file: string;
  readonly size: number;
}

interface IssueAssetWithPath extends IssueAsset {
  readonly url: string;
}

const sized = (dir: string, file: string): IssueAsset => ({
  file,
  size: statSync(resolve(dir, file)).size,
});

const scan = (dir: string): readonly string[] => (existsSync(dir) ? readdirSync(dir) : []);

const matchesLang = (file: string, slug: string, lang: string, ext: string): boolean =>
  file.toLowerCase() === `${slug}.${lang}${ext}`.toLowerCase();

const matchesLegacy = (file: string, slug: string, ext: string): boolean => {
  const lower = file.toLowerCase();
  return lower === `${slug}${ext}`.toLowerCase();
};

const matchesAnyExt = (file: string, ext: string): boolean =>
  file.toLowerCase().endsWith(ext.toLowerCase());

/**
 * Find a per-language asset, falling back to legacy single-language
 * names. Order: `<slug>.<lang><ext>` (preferred), `<slug><ext>`
 * (pre-multilang), then any file with the matching extension (covers
 * historical names like `gazette.pdf`).
 *
 * @param slug - Issue slug, doubles as the directory name
 * @param lang - Active page language (en, ru, it, ...)
 * @param ext - Extension including leading dot (e.g. `.pdf`)
 * @returns Asset descriptor with served URL, or undefined when no candidate exists
 */
export const findIssueAsset = (
  slug: string,
  lang: string,
  ext: string,
): IssueAssetWithPath | undefined => {
  const dir = join(magazineContentDir(), slug, 'assets');
  const files = scan(dir);
  if (files.length === 0) return undefined;
  const langHit = files.find((f) => matchesLang(f, slug, lang, ext));
  const legacyHit = langHit ?? files.find((f) => matchesLegacy(f, slug, ext));
  const anyHit = legacyHit ?? files.find((f) => matchesAnyExt(f, ext));
  if (anyHit === undefined) return undefined;
  const asset = sized(dir, anyHit);
  /*
   * Served path, not the source path: the build integrations copy the
   * assets to `dist/magazine/…` regardless of which directory the
   * content repo currently ships them in.
   */
  return { ...asset, url: `/magazine/${slug}/assets/${asset.file}` };
};
