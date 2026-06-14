import { type CollectionEntry, getCollection } from 'astro:content';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ImageMetadata } from 'astro';
import { DEFAULT_LANGUAGE, type Language } from '@/config/i18n';

/**
 * Derive the album slug from an archive entry id. The id is
 * `{slug}/index.{lang}.md`, so the first path segment is the slug.
 *
 * @param entry - Archive collection entry.
 * @returns The album slug.
 */
export const getArchiveSlug = (entry: CollectionEntry<'archive'>): string =>
  entry.id.split('/').at(0) ?? entry.id;

const sortDate = (entry: CollectionEntry<'archive'>): number =>
  (entry.data.publishDate ?? new Date(0)).getTime();

/**
 * Published archive items for a language, newest first. Mirrors the
 * blog listing's published-only filter; language fallback is handled
 * per-item by {@link getArchiveItem} when a slug lacks a translation.
 *
 * @param lang - Target language.
 * @returns Published archive entries for the language.
 */
export const getArchiveItems = async (
  lang: Language,
): Promise<ReadonlyArray<CollectionEntry<'archive'>>> => {
  const items = await getCollection(
    'archive',
    ({ data }) => data.lang === lang && data.published === true,
  );
  return [...items].sort((a, b) => sortDate(b) - sortDate(a));
};

/**
 * Resolve a single published archive item by slug, falling back to
 * the default-language entry when the requested translation is
 * missing or unpublished.
 *
 * @param slug - Album slug.
 * @param lang - Target language.
 * @returns The entry, or undefined when no published item exists.
 */
export const getArchiveItem = async (
  slug: string,
  lang: Language,
): Promise<CollectionEntry<'archive'> | undefined> => {
  const items = await getCollection('archive', ({ data }) => data.published === true);
  const byKey = new Map(items.map((e) => [`${e.data.lang}/${getArchiveSlug(e)}`, e] as const));
  return byKey.get(`${lang}/${slug}`) ?? byKey.get(`${DEFAULT_LANGUAGE}/${slug}`);
};

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'gif',
  'svg',
]);

const extensionOf = (name: string): string => name.split('.').at(-1)?.toLowerCase() ?? '';

const isImageName = (name: string): boolean => IMAGE_EXTENSIONS.has(extensionOf(name));

/**
 * A single downloadable file belonging to an archive album.
 */
export interface ArchiveFile {
  readonly name: string;
  readonly sizeBytes: number;
  readonly url: string;
  readonly isImage: boolean;
}

/**
 * List every file in an album's `assets/` folder at build time,
 * sorted by name. Non-existent folders yield an empty list so a
 * seeded-but-empty album still builds. URLs point at the copies the
 * archive-files integration ships to `dist/archive/{slug}/assets/*`.
 *
 * @param slug - Album slug.
 * @returns File descriptors sorted by name.
 */
export const listArchiveFiles = (slug: string): ReadonlyArray<ArchiveFile> => {
  const dir = resolve(`src/content/archive/${slug}/assets`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => statSync(resolve(dir, name)).isFile())
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      sizeBytes: statSync(resolve(dir, name)).size,
      url: `/archive/${slug}/assets/${name}`,
      isImage: isImageName(name),
    }));
};

/*
 * Eagerly resolved processable images across every album. Keyed by the
 * source path; we filter to a single slug at call time. Astro processes
 * each match into an ImageMetadata, enabling responsive <Picture>.
 */
const ALBUM_IMAGES = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/archive/*/assets/*.{png,jpg,jpeg,webp,avif,gif,svg}',
  { eager: true },
);

/**
 * A gallery image with its source filename and processed metadata.
 */
export interface ArchiveImage {
  readonly name: string;
  readonly image: ImageMetadata;
}

const slugFromPath = (path: string): string =>
  path.split('/content/archive/').at(1)?.split('/').at(0) ?? '';

const nameFromPath = (path: string): string => path.split('/').at(-1) ?? path;

/**
 * Processed gallery images for one album, sorted by name, ready to
 * feed `<Picture>`. SVGs Astro cannot process are skipped (they have
 * no intrinsic dimensions); they remain available as downloads.
 *
 * @param slug - Album slug.
 * @returns Image descriptors sorted by filename.
 */
export const getArchiveImages = (slug: string): ReadonlyArray<ArchiveImage> =>
  Object.entries(ALBUM_IMAGES)
    .filter(([path]) => slugFromPath(path) === slug)
    .map(([path, mod]) => ({ name: nameFromPath(path), image: mod.default }))
    .sort((a, b) => a.name.localeCompare(b.name));
