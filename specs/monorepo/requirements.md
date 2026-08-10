# Monorepo consolidation — Requirements

## Overview

Today the site code (`public-website`) and the content (`public-website-content`)
live in two repositories. The site build clones the content repo at build time
(`scripts/fetch-content.ts` → `src/content/`), and a content push triggers a
site deploy through a `repository_dispatch` → `workflow_dispatch` hop. Two
consequences the editor rejected:

1. Deploys are attributed to the **service actor** (`undeadliner`) and named
   after the **15-day-old code HEAD**, not the content author — so a fresh
   publication looks like "undeadliner re-deploying old code".
2. There is **no single repository** that unifies site + content and is the
   thing that builds and ships production.

Target: **`public-website` becomes the monorepo.** Content is tracked in-repo at
`src/content/`. The monorepo is the sole build/deploy source. The standalone
`public-website-content` stays the editor's write target (the admin is wired to
it); changes flow **both ways** between it and `src/content/`, and every synced
commit keeps the **original author** (the logged-in editor).

## User stories & acceptance criteria (EARS)

### R1 — Content lives in the monorepo
- WHEN the monorepo is checked out, THE SYSTEM SHALL contain the content tree at
  `src/content/` as tracked files (no nested `.git`, no build-time clone).
- WHEN `bun run build` runs in CI, THE SYSTEM SHALL read content from the
  in-repo `src/content/` and SHALL NOT clone `public-website-content`.

### R2 — Editor edits still land in the content repo, then reach the monorepo
- WHEN an editor saves in the admin, THE SYSTEM SHALL commit to
  `public-website-content` on the branch the admin targets, authored by the
  logged-in editor (unchanged behaviour).
- WHEN a commit lands on `public-website-content` `<branch>`, THE SYSTEM SHALL
  reflect that content into `public-website` `<branch>` `src/content/` within one
  sync run.
- THE resulting monorepo commit SHALL be **authored by the same identity** as the
  originating content commit (editor), with the sync automation only as
  *committer*.

### R3 — Reverse sync
- WHEN `src/content/**` changes on `public-website` `<branch>` by a non-sync
  commit, THE SYSTEM SHALL mirror that change back to `public-website-content`
  `<branch>`, preserving the original author.

### R4 — No sync loops
- WHERE a commit was produced by the sync automation, THE SYSTEM SHALL NOT
  re-sync it back to the origin repo (guarded by a committer identity / message
  marker), so inbound and reverse sync cannot ping-pong.

### R5 — Deploy + attribution
- WHEN content reflects into the monorepo, THE SYSTEM SHALL deploy the matching
  branch from the **monorepo push** (no `repository_dispatch` redeploy hop).
- WHEN the admin shows "Recent Deployments", THE SYSTEM SHALL show the deploy run
  whose HEAD commit is authored by the **editor** and titled by the **content
  change**, not by the service actor or a stale code HEAD.

### R6 — Safety / stability
- IF a sync run cannot fast-forward (diverged), THEN THE SYSTEM SHALL fail loudly
  and SHALL NOT force-push either repo.
- THE production site (`comprom.org`, master) SHALL NOT change until the whole
  pipeline is proven green on `dev.comprom.org` (develop).
- Branch mapping is symmetric 1:1: `develop ↔ develop`, `master ↔ master`.

## Out of scope
- Merging the admin repo. Admin keeps writing `public-website-content`.
- Changing the content markdown format or the reindex step.
