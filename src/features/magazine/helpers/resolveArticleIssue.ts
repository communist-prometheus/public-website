const slugFrom = (id: string): string => id.split('/').at(0) ?? id;

/** Minimal shape needed to reverse-link an article to its issue. */
export interface IssueArticles {
  readonly id: string;
  readonly data: {
    readonly articles?: readonly string[] | undefined;
  };
}

/** The two frontmatter keys an article may name its issue with. */
export interface IssueRefData {
  readonly magazine?: string | undefined;
  readonly newspaper?: string | undefined;
}

/**
 * Read an article's issue back-link. `magazine` is canonical;
 * `newspaper` is the pre-rename key that published articles still
 * carry until the frontmatter migration lands in the content repo.
 * @param data - Article frontmatter.
 * @returns The issue slug the article declares, if any.
 */
export const issueRef = (data: IssueRefData): string | undefined => data.magazine ?? data.newspaper;

/**
 * Determine the magazine-issue slug an article belongs to, for the
 * blog "published in" badge. Prefers the article's own back-link;
 * otherwise falls back to the first issue whose `articles[]` lists this
 * article — so the badge appears whenever an issue references the
 * article, even when the article frontmatter omits the back-link (see
 * tickets#29).
 * @param issues - Magazine collection (only id + articles[] are read).
 * @param articleSlug - The current article's slug.
 * @param ownIssue - The article's own issue back-link, if set.
 * @returns The issue slug, or undefined when nothing references it.
 */
export const resolveIssueSlug = (
  issues: readonly IssueArticles[],
  articleSlug: string,
  ownIssue?: string,
): string | undefined => {
  if (ownIssue) return ownIssue;
  const match = issues.find((i) => i.data.articles?.includes(articleSlug));
  return match ? slugFrom(match.id) : undefined;
};
