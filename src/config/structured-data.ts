import { SITE_URL } from './seo';

interface OrganizationLD {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'Organization';
  readonly name: string;
  readonly alternateName: readonly string[];
  readonly url: string;
  readonly logo: string;
  readonly description: string;
  readonly sameAs: readonly string[];
}

interface WebSiteLD {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'WebSite';
  readonly name: string;
  readonly url: string;
  readonly inLanguage: string;
}

/*
 * Map admin lang code → BCP-47 for schema.org `inLanguage`. Bulgarian
 * uses BCP-47 `bg` even though the project route is `/bl/`.
 */
const inLanguage: Readonly<Record<string, string>> = {
  en: 'en',
  ru: 'ru',
  it: 'it',
  es: 'es',
  bl: 'bg',
  pl: 'pl',
  uk: 'uk',
};

/**
 * Globally-true Organization entity. Stays the same regardless of
 * the page lang — schema.org/Organization is a single canonical
 * entity that anchors the brand in Google's knowledge graph.
 * `sameAs` lets Google reconcile us with off-site identifiers
 * (GitHub, planned social profiles).
 * @returns JSON-LD-shaped Organization record
 */
export const buildOrganizationLD = (): OrganizationLD => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Communist Prometheus',
  alternateName: [
    'Коммунистический Прометей',
    'Prometeo Comunista',
    'Prometeo Comunista (organizzazione marxista rivoluzionaria)',
    'Comunista Prometeo',
    'Революционная марксистская организация',
    'Marxist revolutionary organization',
  ],
  url: SITE_URL,
  logo: `${SITE_URL}/logo-light.svg`,
  description:
    'A revolutionary Marxist organization grounded in the programmatic core of the Communist Manifesto.',
  sameAs: ['https://github.com/communist-prometheus'],
});

/**
 * Per-language WebSite entity. Helps Google associate the site
 * lang with the searched query language.
 * @param lang - Active language for the current page
 * @returns JSON-LD WebSite record
 */
export const buildWebSiteLD = (lang: string): WebSiteLD => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Communist Prometheus',
  url: `${SITE_URL}/${lang}`,
  inLanguage: inLanguage[lang] ?? lang,
});

interface AboutPageLD {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'AboutPage';
  readonly name: string;
  readonly description?: string;
  readonly inLanguage: string;
  readonly url: string;
  readonly mainEntity: {
    readonly '@type': 'Organization';
    readonly name: 'Communist Prometheus';
    readonly url: string;
  };
}

interface AboutPageInput {
  readonly title: string;
  readonly description?: string;
  readonly lang: string;
  readonly url: string;
}

/**
 * AboutPage entity for the per-language `/<lang>/about` route. Wires
 * the page to the canonical Organization entity declared in
 * buildOrganizationLD via `mainEntity`, which Google uses to disambiguate
 * whose About page this is when assembling the knowledge-graph card.
 * @param input - Page fields (title, optional description, lang, url)
 * @returns JSON-LD AboutPage record
 */
export const buildAboutPageLD = (input: AboutPageInput): AboutPageLD => ({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: input.title,
  ...(input.description ? { description: input.description } : {}),
  inLanguage: inLanguage[input.lang] ?? input.lang,
  url: input.url,
  mainEntity: {
    '@type': 'Organization',
    name: 'Communist Prometheus',
    url: SITE_URL,
  },
});

interface BlogPostingLD {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'BlogPosting';
  readonly headline: string;
  readonly description?: string;
  readonly inLanguage: string;
  readonly datePublished?: string;
  readonly url: string;
  readonly mainEntityOfPage: string;
  readonly publisher: {
    readonly '@type': 'Organization';
    readonly name: 'Communist Prometheus';
    readonly logo: { readonly '@type': 'ImageObject'; readonly url: string };
  };
  readonly image?: string;
  readonly articleSection?: string;
}

interface BlogPostingInput {
  readonly title: string;
  readonly description?: string;
  readonly lang: string;
  readonly publishDate?: Date;
  readonly url: string;
  readonly image?: string;
  readonly category?: string;
}

/**
 * Per-article BlogPosting entity. Triggers Google's article rich
 * results (headline, image, byline) when paired with a canonical
 * URL on the page. The Organization publisher block anchors the
 * article to the brand entity declared in buildOrganizationLD.
 * @param input - Article fields extracted from the collection entry
 * @returns JSON-LD BlogPosting record
 */
export const buildBlogPostingLD = (input: BlogPostingInput): BlogPostingLD => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: input.title,
  ...(input.description ? { description: input.description } : {}),
  inLanguage: inLanguage[input.lang] ?? input.lang,
  ...(input.publishDate ? { datePublished: input.publishDate.toISOString() } : {}),
  url: input.url,
  mainEntityOfPage: input.url,
  publisher: {
    '@type': 'Organization',
    name: 'Communist Prometheus',
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-light.svg` },
  },
  ...(input.image ? { image: input.image } : {}),
  ...(input.category ? { articleSection: input.category } : {}),
});
