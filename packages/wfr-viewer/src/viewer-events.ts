import type { FileDescriptor, ViewerContent } from '@web-file-reader/core';

/** Dispatched when content for a file finishes rendering. */
export const WFR_VIEWER_LOAD: 'wfr-viewer-load' = 'wfr-viewer-load';
/** Dispatched when rendering fails or no provider matches. */
export const WFR_VIEWER_ERROR: 'wfr-viewer-error' = 'wfr-viewer-error';

export interface WfrViewerLoadDetail {
  readonly file: FileDescriptor;
  readonly content: ViewerContent;
}

export interface WfrViewerErrorDetail {
  readonly file: FileDescriptor;
  readonly error: Error;
}

export type WfrViewerLoadEvent = CustomEvent<WfrViewerLoadDetail>;
export type WfrViewerErrorEvent = CustomEvent<WfrViewerErrorDetail>;

declare global {
  interface HTMLElementEventMap {
    'wfr-viewer-load': WfrViewerLoadEvent;
    'wfr-viewer-error': WfrViewerErrorEvent;
  }
}
