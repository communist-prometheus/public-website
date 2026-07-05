import type { FileDescriptor } from '@web-file-reader/core';

/** Event name dispatched when a tile is activated. */
export const WFR_OPEN: 'wfr-open' = 'wfr-open';

/** Detail payload for {@link WFR_OPEN}. */
export interface WfrOpenDetail {
  readonly file: FileDescriptor;
  readonly index: number;
}

/** Strongly-typed open event. */
export type WfrOpenEvent = CustomEvent<WfrOpenDetail>;

/** Construct a bubbling, composed open event. */
export const createOpenEvent = (detail: WfrOpenDetail): WfrOpenEvent =>
  new CustomEvent(WFR_OPEN, { detail, bubbles: true, composed: true });

declare global {
  interface HTMLElementEventMap {
    'wfr-open': WfrOpenEvent;
  }
}
