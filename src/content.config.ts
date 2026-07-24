import { defineCollection, z } from 'astro:content';
import { SUPPORTED_LANGUAGES } from '@/config/i18n';

const langEnum = z.string().refine((v) => SUPPORTED_LANGUAGES.includes(v));

const blogCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /*
       * Description is the editorial card preview. Listings show it
       * directly and fall back to the body's first paragraph (via
       * deriveSummary) when missing. The article page also renders
       * it as a lead block when present.
       */
      description: z.string().optional(),
      category: z.string(),
      /*
       * `pubDate` is legacy; `publishDate` is the canonical publish
       * timestamp set by the admin when the editor flips Published
       * on. Both optional so an in-progress draft saves cleanly
       * without forcing the editor to invent a date — public pages
       * already tolerate missing dates via `?? new Date(0)` fallbacks.
       */
      pubDate: z.date().optional(),
      /*
       * Absent / non-true `published` means draft. The build does NOT
       * render drafts (see getBlogPosts). Editors must explicitly set
       * `published: true` for an article to ship to the live site.
       */
      published: z.boolean().optional(),
      publishDate: z.date().optional(),
      image: image().optional(),
      lang: langEnum,
      /*
       * Optional editorial topic key (see settings/topics.json). A topic
       * is a parallel marker to `category`: it colours the article header
       * (a transparent→topic-colour gradient with the topic name and
       * subtitle) and the listing card (coloured border + subtitle tag),
       * letting readers tell editorial pieces from translations and
       * likbez readers at a glance. Optional so existing articles and
       * drafts stay valid; an unknown key degrades to no marker.
       */
      topic: z.string().optional(),
      /*
       * Optional magazine-issue slug this article appeared in. The blog
       * detail page renders "Published in: <issue>" linking back to
       * /<lang>/magazine/<slug> when present. `newspaper` is the
       * pre-rename key published articles still carry until the content
       * repo's frontmatter migration lands — read via `issueRef`.
       */
      magazine: z.string().optional(),
      newspaper: z.string().optional(),
      /*
       * Optional archive-item slug attached to this article. The blog
       * detail page renders an ArchiveWidget gallery at the foot when
       * present and the referenced item is published.
       */
      archive: z.string().optional(),
    }),
});

const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    lang: langEnum,
    heroTitle: z.string().optional(),
    subtitle: z.string().optional(),
    latestNews: z.string().optional(),
    viewAllPosts: z.string().optional(),
    heading: z.string().optional(),
    allCategory: z.string().optional(),
  }),
});

const positionsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    /* Optional: see blogCollection. Listings derive a body preview. */
    description: z.string().optional(),
    pubDate: z.date().optional(),
    /* See blog: absent / non-true is draft. */
    published: z.boolean().optional(),
    publishDate: z.date().optional(),
    lang: langEnum,
    /* See blogCollection.archive. */
    archive: z.string().optional(),
  }),
});

/*
 * An archive item is an album: frontmatter is listing metadata, the
 * payload is the files in its `assets/` folder (shipped to dist by the
 * archive-files integration). Images are listed for the gallery; other
 * files are download-only.
 */
const archiveCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      published: z.boolean().optional(),
      publishDate: z.date().optional(),
      image: image().optional(),
      lang: langEnum,
    }),
});

const commonCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    lang: langEnum,
    home: z.string().optional(),
    about: z.string().optional(),
    blog: z.string().optional(),
    positions: z.string().optional(),
    manifest: z.string().optional(),
    /*
     * Nav label for the magazine section. `newspaper` is the pre-rename
     * key the menu entries still carry until the content repo migrates;
     * the nav builder falls back to it so the link never disappears
     * mid-migration.
     */
    magazine: z.string().optional(),
    newspaper: z.string().optional(),
    /* Nav label for the archive section (menu entry). */
    archive: z.string().optional(),
    links: z.string().optional(),
    menu: z.string().optional(),
    copyright: z.string().optional(),
    readMore: z.string().optional(),
    /*
     * Magazine-issue download labels. Distinct keys so editors can
     * localise PDF and FB2 buttons separately and so the layout no
     * longer reuses `readMore` (which was visually wrong: a "Read
     * more" button that actually downloads a binary).
     */
    downloadPdf: z.string().optional(),
    downloadFb2: z.string().optional(),
    viewAll: z.string().optional(),
    backToList: z.string().optional(),
    tableOfContents: z.string().optional(),
    /*
     * Archive UI labels. All optional with inline English fallbacks at
     * the call sites, so the build stays green before the content repo
     * ships the translations.
     */
    archiveTitle: z.string().optional(),
    viewArchive: z.string().optional(),
    archiveFiles: z.string().optional(),
    openViewer: z.string().optional(),
  }),
});

/*
 * The two issue collections are spelled out rather than produced by a
 * shared factory ON PURPOSE. admin-website mirrors this file and guards
 * the mirror against drift by SCRAPING this source with the regex
 * `const (\w+)Collection = defineCollection\(` (see
 * e2e-realmode/astro-schema-drift.spec.ts). A factory call is invisible
 * to it, so every collection here must keep that literal shape or the
 * admin's guard silently stops seeing it.
 */
const magazineCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /* Optional: see blogCollection. */
      description: z.string().optional(),
      pubDate: z.date().optional(),
      // See blog: absent / non-true is draft.
      published: z.boolean().optional(),
      publishDate: z.date().optional(),
      image: image().optional(),
      lang: langEnum,
      /*
       * Optional ordered list of blog-article slugs in this issue.
       * The magazine detail page renders these as a TOC linking to
       * /<lang>/blog/<slug>. Slugs reference the blog collection,
       * so removing a referenced article leaves a stale link — kept
       * intentional so editors notice and fix the TOC.
       */
      articles: z.array(z.string()).optional(),
    }),
});

/*
 * TRANSITIONAL: the same schema over the pre-rename `newspaper/`
 * directory. The content repo's folder rename auto-merges to master and
 * rebuilds prod on its own schedule, so the build has to read whichever
 * directory is present. `getCollection` on an absent directory warns and
 * returns [] rather than failing, so exactly one of these is ever
 * populated. Drop it once the content repo is migrated.
 */
const newspaperCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.date().optional(),
      published: z.boolean().optional(),
      publishDate: z.date().optional(),
      image: image().optional(),
      lang: langEnum,
      articles: z.array(z.string()).optional(),
    }),
});

export const collections = {
  blog: blogCollection,
  pages: pagesCollection,
  positions: positionsCollection,
  common: commonCollection,
  magazine: magazineCollection,
  newspaper: newspaperCollection,
  archive: archiveCollection,
};
