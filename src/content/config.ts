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
    order: z.number(),
    lang: langEnum,
  }),
});

const commonCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    lang: langEnum,
    home: z.string().optional(),
    blog: z.string().optional(),
    positions: z.string().optional(),
    manifest: z.string().optional(),
    menu: z.string().optional(),
    copyright: z.string().optional(),
    readMore: z.string().optional(),
    viewAll: z.string().optional(),
    backToList: z.string().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  pages: pagesCollection,
  positions: positionsCollection,
  common: commonCollection,
};
