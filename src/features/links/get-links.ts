import linksDoc from '@/content/settings/links.json';
import faviconManifest from '@/data/favicon-manifest.json';

/** One curated external link (from content `settings/links.json`). */
export interface LinkEntry {
  readonly url: string;
  readonly name: string;
  readonly category: string;
  readonly inRing: boolean;
  readonly descriptions: Readonly<Record<string, string>>;
}

export interface LinkGroup {
  readonly id: string;
  readonly entries: readonly LinkEntry[];
}

const doc = linksDoc as {
  readonly groups: readonly string[];
  readonly entries: readonly LinkEntry[];
};

const manifest = faviconManifest as Readonly<Record<string, string>>;

/**
 * Link groups in the document's declared order, each holding its
 * entries (document order preserved).
 * @returns Ordered groups with their entries.
 */
export const getLinkGroups = (): readonly LinkGroup[] =>
  doc.groups.map((id) => ({
    id,
    entries: doc.entries.filter((e) => e.category === id),
  }));

/**
 * Localised description for an entry: the requested language, else
 * the English fallback, else empty.
 * @param entry - The link entry.
 * @param lang - Active page language.
 * @returns The best-available description.
 */
const FALLBACK_LANG = 'en';

export const describe = (entry: LinkEntry, lang: string): string =>
  entry.descriptions[lang] ?? entry.descriptions[FALLBACK_LANG] ?? '';

const hostOf = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

/**
 * Self-hosted favicon path for an entry's host, or `undefined` when
 * the build-time fetch produced none (the page renders a fallback
 * glyph). Favicons are fetched at build and served from our own
 * origin — visitors never contact a third-party icon service.
 * @param url - The entry URL.
 * @returns A local `/favicons/...` path, or undefined.
 */
export const faviconFor = (url: string): string | undefined => manifest[hostOf(url)];
