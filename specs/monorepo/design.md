# Monorepo consolidation — Design

## Decision: tracked `src/content/` + mirror bot (not git-subtree)

`src/content/` becomes **plain tracked files** in `public-website`. Sync is a
**tree-materialising mirror bot**, not `git subtree`. Rationale: subtree
pull/push produces merge commits whose author is the bot (breaks R2) and whose
merges conflict on divergence (breaks R6). A wholesale tree copy + a single
author-preserving commit is deterministic, conflict-free, and puts the editor's
identity on the monorepo HEAD (which is what the deploy + admin read).

Satisfies: R1 (in-repo content), R2 (author on HEAD), R6 (no fragile merges).

## Data flow

```
editor save ─▶ public-website-content/<branch>   (author = editor)   [R2]
                     │  push
                     ▼
        [inbound sync Action, in content repo]
          materialise content tree ─▶ public-website/<branch>/src/content
          commit --author="<editor>" --committer="<sync-bot>"          [R2,R4]
                     │  push
                     ▼
        public-website/<branch>  push ─▶ deploy.yml (branch)           [R5]
                     ▼
             comprom.org / dev.comprom.org

dev edits src/content in monorepo ─▶ [reverse sync Action, in public-website]
          mirror src/content ─▶ public-website-content/<branch>         [R3,R4]
```

## Components

### C1. Seed `src/content/` (per branch)
- Untrack the build-time clone: `src/content/` currently gitignored + fetched.
  Remove it from `.gitignore`; commit the content tree (from
  `public-website-content` tip of the same branch) into `src/content/`.
- `scripts/fetch-content.ts` no longer clones in CI. Keep it usable for local
  dev via `CONTENT_KEEP`. Simplest: prebuild sets `CONTENT_KEEP=1` (skip refresh)
  — the checked-out `src/content/` is authoritative. `.gitattributes`/LFS
  unchanged; binaries commit as-is (matches the current 93 MB working tree).

### C2. Inbound sync — `public-website-content/.github/workflows/sync-to-monorepo.yml`
- Trigger: `push` on `[master, develop]`, plus `paths-ignore` nothing (content
  is the payload). Guard: skip if `github.actor` is the sync bot OR HEAD message
  contains the marker `[sync-from-monorepo]` (R4).
- Steps: checkout content @ pushed sha (full tree); checkout public-website @
  same branch; `rsync --delete` content tree → `public-website/src/content/`
  (excluding `.git`, `.github`); if diff:
  `git commit --author="$CONTENT_AUTHOR" -m "content: <orig subject> [sync-from-content]"`
  where `$CONTENT_AUTHOR` = `git log -1 --format='%an <%ae>'` of the content push;
  committer = `comprom-sync <bot@comprom.org>`. Push to `public-website/<branch>`.
- Auth: a PAT (`SYNC_PAT`) with `contents:write` on public-website. Fail loudly,
  never force-push (R6).

### C3. Reverse sync — `public-website/.github/workflows/sync-to-content.yml`
- Trigger: `push` on `[master, develop]` with `paths: [src/content/**]`.
- Guard: skip if HEAD message contains `[sync-from-content]` OR committer is the
  sync bot (R4) — this is the commit inbound just made, must not bounce back.
- Steps: mirror `src/content/` → `public-website-content/<branch>` with the same
  author-preserving single commit, marker `[sync-from-monorepo]`. Push. (R3)

### C4. Deploy trigger + attribution (R5)
- `public-website/deploy.yml`: keep `push: [master, develop]`. The inbound sync's
  push now *is* the deploy trigger — content changes arrive as a real monorepo
  commit authored by the editor.
- Delete `redeploy-on-content.yml` and the content repo's
  `trigger-deploy.yml` content→dispatch hop (superseded by C2). `prebuild`
  stops cloning (C1), so `CONTENT_BRANCH` is no longer needed.
- Admin "Recent Deployments" already lists `public-website` `deploy.yml` runs;
  with the head commit now authored by the editor, the displayed author/title are
  correct with no admin code change. Verify the admin reads
  `run.head_commit.author` (not the actor).

### C5. Loop-prevention invariants
- Every sync commit carries BOTH a bot committer identity and a message marker.
- Inbound skips `[sync-from-monorepo]`; reverse skips `[sync-from-content]`.
- A human commit never carries a marker, so it always syncs exactly once.

## Rollout (R6)
1. All of C1–C4 on **develop** first. Prove on `dev.comprom.org`.
2. Only then replicate the seed on master + open develop→master; verify
   `comprom.org`. Get explicit go before the master/prod step.

## Risks
- **History size**: committing content (~93 MB working tree) into public-website
  grows its history once. Accepted (inherent to a monorepo).
- **Divergence**: if both repos edit the same file between syncs, last-writer
  wins at the tree level; bot fails rather than force-pushing (R6). Editors work
  through the admin (content repo) only, so concurrent edits are unlikely.
- **PAT scope**: `SYNC_PAT` needs `contents:write` on both repos; store as repo
  secret, least-privilege.
