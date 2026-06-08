import featuresData from '@/content/settings/features.json';

/**
 * Build-time feature flags. The source of truth lives in the
 * content repo at `settings/features.json` and is pulled in by
 * `scripts/fetch-content.ts` alongside the rest of the site
 * content. Flipping a flag is a content-repo commit — no code
 * change required.
 *
 * Adding a new flag: extend `FeatureFlags` with the field, add
 * the field to `DEFAULTS` (so old content checkouts keep
 * building), and surface it in the admin UI editor.
 */
export type FeatureFlags = {
  readonly webring: boolean;
};

const DEFAULTS: FeatureFlags = {
  webring: false,
};

type PartialFlags = { readonly webring?: unknown };

const isObject = (x: unknown): x is PartialFlags => x !== null && typeof x === 'object';

const readBool = (raw: unknown, fallback: boolean): boolean =>
  typeof raw === 'boolean' ? raw : fallback;

const parse = (raw: unknown): FeatureFlags =>
  isObject(raw) ? { webring: readBool(raw.webring, DEFAULTS.webring) } : DEFAULTS;

/**
 * Resolved feature-flag bundle, ready for `{features.X && ...}`
 * conditional rendering at build time.
 */
export const features: FeatureFlags = parse(featuresData);
