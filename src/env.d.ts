/// <reference types="astro/client" />

interface ImportMetaEnv {
  /**
   * Per-environment override for the `archive` feature flag, set by the
   * deploy workflow ('true' | 'false'). Declared so it is a known key
   * (dot access, no index-signature ts(4111)). See `src/config/features.ts`.
   */
  readonly PUBLIC_FEATURE_ARCHIVE?: string;
  /** Per-environment override for the `webring` feature flag. */
  readonly PUBLIC_FEATURE_WEBRING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
