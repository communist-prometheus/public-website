import { defineCollection, z } from 'astro:content';
import { SUPPORTED_LANGUAGES } from '@/config/i18n';

const langEnum = z.string().refine((v) => SUPPORTED_LANGUAGES.includes(v));

const blogCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      category: z.string(),
      pubDate: z.date(),
      /*
       * Absent / non-true `published` means draft. The build does NOT
       * render drafts (see getBlogPosts). Editors must explicitly set
       * `published: true` for an article to ship to the live site.
       */
      published: z.boolean().optional(),
      publishDate: z.date().optional(),
      image: image().optional(),
      lang: langEnum,
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
    description: z.string(),
    pubDate: z.date().optional(),
    /* See blog: absent / non-true is draft. */
    published: z.boolean().optional(),
    publishDate: z.date().optional(),
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
    newspaper: z.string().optional(),
    menu: z.string().optional(),
    copyright: z.string().optional(),
    readMore: z.string().optional(),
    viewAll: z.string().optional(),
    backToList: z.string().optional(),
  }),
});

const newspaperCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.date().optional(),
      // See blog: absent / non-true is draft.
      published: z.boolean().optional(),
      publishDate: z.date().optional(),
      image: image().optional(),
      lang: langEnum,
    }),
});

export const collections = {
  blog: blogCollection,
  pages: pagesCollection,
  positions: positionsCollection,
  common: commonCollection,
  newspaper: newspaperCollection,
};
