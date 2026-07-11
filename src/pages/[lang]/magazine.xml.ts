import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SUPPORTED_LANGUAGES } from '@/config/i18n';
import { getMagazineItems } from '@/features/magazine/helpers/getMagazineItems';

/**
 * Per-locale magazine feed at `/<lang>/magazine.xml`.
 * Lists every published magazine issue in that locale, newest first,
 * with the issue page as the link and `publishDate` as `pubDate`.
 * Consumed by the comms-worker newsletter to announce a new issue (and
 * to point at the current one) — see services/comms-worker. The old
 * `/<lang>/newspaper.xml` path 301s here, so a worker that has not been
 * redeployed yet keeps resolving the feed.
 *
 * @returns one feed per supported language.
 */
export const getStaticPaths = () => SUPPORTED_LANGUAGES.map((lang) => ({ params: { lang } }));

const SITE_URL = 'https://comprom.org';

/** First path segment of an entry id is the issue slug. */
const slugFrom = (id: string): string => id.split('/').at(0) ?? id;

interface FeedParams {
  readonly lang?: string;
}

/**
 * Build the magazine RSS feed for the requested locale.
 * @param context - Astro endpoint context carrying `params.lang`.
 * @returns RSS XML response.
 */
export const GET = async (context: APIContext) => {
  const params: FeedParams = context.params;
  const lang = params.lang ?? 'en';
  const issues = await getMagazineItems(lang);
  const items = issues.map((issue) => ({
    title: issue.data.title,
    link: `/${lang}/magazine/${slugFrom(issue.id)}`,
    pubDate: issue.data.publishDate ?? issue.data.pubDate,
    description: issue.data.description ?? issue.data.title,
  }));

  return rss({
    title: 'Communist Prometheus — Magazine',
    description: 'Magazine issues from Communist Prometheus',
    site: context.site?.toString() ?? SITE_URL,
    items,
    customData: `<language>${lang}</language>`,
  });
};
