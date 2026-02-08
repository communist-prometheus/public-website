import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      category: z.string(),
      pubDate: z.date(),
      image: image().optional(),
      lang: z.enum(['en', 'ru']),
    }),
});

const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    lang: z.enum(['en', 'ru']),
  }),
});

export const collections = {
  blog: blogCollection,
  pages: pagesCollection,
};
