import type { SearchDoc, SearchSection } from '@prometheus/search-core';
import { contentHash } from '@prometheus/search-core';
import { features } from '@/config/features';
import type { Language } from '@/config/i18n';
import { getPageData } from '@/config/translations';
import { getArchiveItems, getArchiveSlug } from '@/features/archive/helpers/getArchiveItems';
import { getArticleSlug, getBlogPosts } from '@/features/blog/helpers/getBlogPosts';
import { toPlainText } from '@/features/content/helpers/stripMarkdown';
import { getMagazineItems } from '@/features/magazine/helpers/getMagazineItems';
import { getPositions } from '@/features/positions/helpers/getPositions';

/*
 * The search index is built from the same helpers the pages are built
 * from — `getBlogPosts`, `getPositions`, `getMagazineItems`,
 * `getArchiveItems` — and never from the collections directly. That is
 * deliberate: those helpers carry the `published === true` gate, so a
 * draft cannot leak into the index, and a result can never point at a URL
 * the build did not emit.
 */

/** Minimum a section entry has to expose to be indexable. */
interface Indexable {
  readonly id: string;
  readonly body?: string | undefined;
  readonly data: {
    readonly title: string;
    readonly description?: string | undefined;
  };
}

const slugOf = (id: string): string => id.split('/').at(0) ?? id;

const toDoc = (
  lang: Language,
  section: SearchSection,
  slug: string,
  entry: Indexable,
  url: string,
): SearchDoc => {
  const title = entry.data.title;
  const description = entry.data.description ?? '';
  const body = toPlainText(entry.body ?? '');
  return {
    id: `${lang}/${section}/${slug}`,
    lang,
    section,
    slug,
    url,
    title,
    description,
    body,
    hash: contentHash(title, description, body),
  };
};

const sectionDocs = async (lang: Language): Promise<readonly SearchDoc[]> => {
  const [posts, positions, issues] = await Promise.all([
    getBlogPosts(lang),
    getPositions(lang),
    getMagazineItems(lang),
  ]);
  return [
    ...posts.map((p) =>
      toDoc(lang, 'blog', getArticleSlug(p), p, `/${lang}/blog/${getArticleSlug(p)}`),
    ),
    ...positions.map((p) =>
      toDoc(lang, 'positions', slugOf(p.id), p, `/${lang}/positions/${slugOf(p.id)}`),
    ),
    ...issues.map((i) =>
      toDoc(lang, 'magazine', slugOf(i.id), i, `/${lang}/magazine/${slugOf(i.id)}`),
    ),
  ];
};

/*
 * Archive is behind a build flag and ships OFF in production. Indexing it
 * regardless would offer the reader results whose pages do not exist.
 */
const archiveDocs = async (lang: Language): Promise<readonly SearchDoc[]> => {
  if (!features.archive) return [];
  const items = await getArchiveItems(lang);
  return items.map((item) => {
    const slug = getArchiveSlug(item);
    return toDoc(lang, 'archive', slug, item, `/${lang}/archive/${slug}`);
  });
};

/*
 * Only the prose pages. `home` and the `*-listing` entries are carriers
 * for headings and CTA labels, not documents — indexing them would put
 * "Latest news" in the results.
 */
const PROSE_PAGES = ['about', 'manifest'] as const;

const pageDocs = async (lang: Language): Promise<readonly SearchDoc[]> => {
  const entries = await Promise.all(
    PROSE_PAGES.map(async (slug) => ({ slug, entry: await getPageData(slug, lang) })),
  );
  return entries.flatMap(({ slug, entry }) =>
    entry === undefined ? [] : [toDoc(lang, 'page', slug, entry, `/${lang}/${slug}`)],
  );
};

/**
 * Every published document one language can search.
 * @param lang Target language.
 * @returns Documents, ready to serialise into the index.
 */
export const buildIndex = async (lang: Language): Promise<readonly SearchDoc[]> => {
  const groups = await Promise.all([sectionDocs(lang), archiveDocs(lang), pageDocs(lang)]);
  return groups.flat();
};
