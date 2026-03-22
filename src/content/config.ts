import { defineCollection, z } from 'astro:content';

const langEnum = z.enum(['en', 'ru', 'it', 'es']);

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
    readMore: z.string().optional(),
    viewAll: z.string().optional(),
    backToList: z.string().optional(),
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

const navCollection = defineCollection({
  type: 'content',
  schema: z.object({
    home: z.string(),
    blog: z.string(),
    positions: z.string(),
    manifest: z.string(),
    menu: z.string(),
    copyright: z.string(),
    lang: langEnum,
  }),
});

export const collections = {
  blog: blogCollection,
  pages: pagesCollection,
  positions: positionsCollection,
  nav: navCollection,
};
