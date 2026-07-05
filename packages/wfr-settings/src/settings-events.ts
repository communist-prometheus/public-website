import type { ProviderSettings } from '@web-file-reader/core';

/** Dispatched whenever a setting changes. */
export const WFR_SETTINGS_CHANGE: 'wfr-settings-change' = 'wfr-settings-change';

export interface WfrSettingsChangeDetail {
  /** The complete, schema-valid settings after the change. */
  readonly settings: ProviderSettings;
  /** The settings serialized for host-side persistence. */
  readonly serialized: string;
}

export type WfrSettingsChangeEvent = CustomEvent<WfrSettingsChangeDetail>;

declare global {
  interface HTMLElementEventMap {
    'wfr-settings-change': WfrSettingsChangeEvent;
  }
}
