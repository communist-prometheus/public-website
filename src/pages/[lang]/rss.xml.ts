import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SUPPORTED_LANGUAGES } from '@/config/i18n';
import { getArticleSlug } from '@/features/blog/helpers/getBlogPosts';
import { deriveDescription } from '@/features/content/helpers/deriveDescription';

/**
 * Per-locale RSS feed exposed at `/<lang>/rss.xml`.
 * Lists every published blog post in that locale, newest first,
 * carrying title + the same auto-derived description used on the
 * page (frontmatter description with first-paragraph fallback).
 *
 * @returns one feed per supported language.
 */
export const getStaticPaths = () => SUPPORTED_LANGUAGES.map((lang) => ({ params: { lang } }));

const SITE_URL = 'https://comprom.org';

/**
 * Build the RSS feed for the requested locale.
 *
 * @param context - Astro endpoint context carrying `params.lang`.
 * @returns RSS XML response.
 */
interface RssParams {
  readonly lang?: string;
}

export const GET = async (context: APIContext) => {
  const params: RssParams = context.params;
  const lang = params.lang ?? 'en';
  const posts = await getCollection(
    'blog',
    ({ data }) => data.published === true && data.lang === lang,
  );
  const items = posts
    .map((post) => ({
      title: post.data.title,
      link: `/${lang}/blog/${getArticleSlug(post)}`,
      pubDate: post.data.publishDate ?? post.data.pubDate,
      description: deriveDescription(post.data.description, post.body),
    }))
    .sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));

  return rss({
    title: 'Communist Prometheus',
    description: 'Articles from Communist Prometheus',
    site: context.site?.toString() ?? SITE_URL,
    items,
    customData: `<language>${lang}</language>`,
  });
};
