import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Scan src/content at test-collection time so the language-coverage
 * spec only asserts (lang, section) tuples that actually exist —
 * after PR #74 (empty-section gating) every absent section returns
 * 404 by design, and the old "every lang has every section" matrix
 * was lying.
 */

const here = dirname(fileURLToPath(import.meta.url));
const contentRoot = join(here, '..', '..', 'src', 'content');

const collectionRoot = (collection: string): string => join(contentRoot, collection);

const slugLangs = (slugDir: string): readonly string[] =>
  existsSync(slugDir)
    ? readdirSync(slugDir)
        .map((f) => f.match(/^index\.([a-z]{2})\.md$/)?.[1])
        .filter((c): c is string => c !== undefined)
    : [];

const collectionLangs = (collection: string): ReadonlySet<string> => {
  const dir = collectionRoot(collection);
  if (!existsSync(dir)) return new Set();
  const out = new Set<string>();
  for (const slug of readdirSync(dir)) {
    for (const lang of slugLangs(join(dir, slug))) out.add(lang);
  }
  return out;
};

const pageLangs = (slug: string): ReadonlySet<string> =>
  new Set(slugLangs(join(contentRoot, 'pages', slug)));

/**
 * Per-section presence map keyed by language code. Used by the
 * coverage spec to skip tests that would 404 by design.
 *
 * @returns Lookup of `lang → Set<section>` for sections present.
 */
export const buildSectionAvailability = (): ReadonlyMap<string, ReadonlySet<string>> => {
  const sections: ReadonlyArray<readonly [string, ReadonlySet<string>]> = [
    ['blog', collectionLangs('blog')],
    ['positions', collectionLangs('positions')],
    /*
     * The content repo still ships the issues under `newspaper/` until
     * its folder rename lands; the site serves them at /magazine either
     * way. Union the two so this map is right on both sides of that
     * commit — only one of them ever has entries.
     */
    ['magazine', new Set([...collectionLangs('magazine'), ...collectionLangs('newspaper')])],
    ['manifest', pageLangs('manifest')],
    ['about', pageLangs('about')],
  ];
  const byLang = new Map<string, Set<string>>();
  for (const [section, langs] of sections) {
    for (const l of langs) {
      const existing = byLang.get(l) ?? new Set<string>();
      existing.add(section);
      byLang.set(l, existing);
    }
  }
  /* Home is always present per the public-site contract. */
  for (const set of byLang.values()) set.add('home');
  return byLang;
};

/**
 * Convenience: does this lang/section combination exist in the
 * content snapshot the tests are running against?
 *
 * @param map Output of buildSectionAvailability.
 * @param lang Language code.
 * @param section Section slug — blog, positions, magazine,
 * manifest, about, home.
 * @returns true when content exists.
 */
export const hasSection = (
  map: ReadonlyMap<string, ReadonlySet<string>>,
  lang: string,
  section: string,
): boolean => map.get(lang)?.has(section) ?? false;
