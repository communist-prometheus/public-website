const slugFrom = (id: string): string => id.split('/').at(0) ?? id;

/** Minimal shape needed to reverse-link an article to its issue. */
export interface IssueArticles {
  readonly id: string;
  readonly data: {
    readonly articles?: readonly string[] | undefined;
  };
}

/**
 * Determine the newspaper-issue slug an article belongs to, for the
 * blog "published in" badge. Prefers the article's own `newspaper`
 * slug; otherwise falls back to the first issue whose `articles[]`
 * lists this article — so the badge appears whenever an issue
 * references the article, even when the article frontmatter omits the
 * back-link (see tickets#29).
 * @param issues - Newspaper collection (only id + articles[] are read).
 * @param articleSlug - The current article's slug.
 * @param ownNewspaper - The article's own `newspaper` field, if set.
 * @returns The issue slug, or undefined when nothing references it.
 */
export const resolveIssueSlug = (
  issues: readonly IssueArticles[],
  articleSlug: string,
  ownNewspaper?: string,
): string | undefined => {
  if (ownNewspaper) return ownNewspaper;
  const match = issues.find((i) => i.data.articles?.includes(articleSlug));
  return match ? slugFrom(match.id) : undefined;
};
