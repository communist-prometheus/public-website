import featuresData from '@/content/settings/features.json';

/**
 * Build-time feature flags. The content repo at
 * `settings/features.json` (pulled by `scripts/fetch-content.ts`) is
 * the default source of truth — flipping a flag there is a content
 * commit, no code change. A per-environment build env var
 * (`PUBLIC_FEATURE_<NAME>=true|false`, set by the deploy workflow per
 * branch) OVERRIDES the content value, so the same content can ship a
 * section enabled on dev and disabled on prod (e.g. `archive` off in
 * production while it is still being polished).
 *
 * Adding a new flag: extend `FeatureFlags` with the field, add
 * the field to `DEFAULTS` (so old content checkouts keep
 * building), wire its `PUBLIC_FEATURE_*` override below, and surface
 * it in the admin UI editor.
 */
export type FeatureFlags = {
  readonly webring: boolean;
  readonly archive: boolean;
};

const DEFAULTS: FeatureFlags = {
  webring: false,
  archive: false,
};

type PartialFlags = {
  readonly webring?: unknown;
  readonly archive?: unknown;
};

const isObject = (x: unknown): x is PartialFlags => x !== null && typeof x === 'object';

const readBool = (raw: unknown, fallback: boolean): boolean =>
  typeof raw === 'boolean' ? raw : fallback;

const parse = (raw: unknown): FeatureFlags =>
  isObject(raw)
    ? {
        webring: readBool(raw.webring, DEFAULTS.webring),
        archive: readBool(raw.archive, DEFAULTS.archive),
      }
    : DEFAULTS;

/**
 * A `PUBLIC_FEATURE_*` build override: 'true'/'false' wins over the
 * content value; anything else (unset) defers to content.
 */
const envOverride = (raw: unknown): boolean | undefined =>
  raw === 'true' ? true : raw === 'false' ? false : undefined;

const fromContent = parse(featuresData);

/**
 * Resolved feature-flag bundle, ready for `{features.X && ...}`
 * conditional rendering at build time. Env override > content > default.
 */
export const features: FeatureFlags = {
  webring: envOverride(import.meta.env.PUBLIC_FEATURE_WEBRING) ?? fromContent.webring,
  archive: envOverride(import.meta.env.PUBLIC_FEATURE_ARCHIVE) ?? fromContent.archive,
};
