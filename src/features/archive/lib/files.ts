import type { FileDescriptor } from '@web-file-reader/core';

/*
 * The reference wfr-host ships a static FILES array; ours is per-page because
 * each archive album has its own file set. Grid.astro calls `setFiles()` with
 * the current page's descriptors on mount; setup-viewer.ts reads them via
 * `getFiles()` / `fileById` / `indexOfFile` — same surface as the reference,
 * only the source is dynamic.
 */
let CURRENT: readonly FileDescriptor[] = [];

/** Replace the current file list (called by the archive gallery on mount). */
export const setFiles = (files: readonly FileDescriptor[]): void => {
  CURRENT = files;
  /*
   * setupViewer's initial syncToLocation runs before Grid's mount script has
   * called setFiles — so an initial `#asset=<id>` deep-link sees an empty
   * list and stays closed. Dispatch a custom event that setupViewer listens
   * for and re-syncs to the current URL now that files are available.
   */
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('archive-files-ready'));
  }
};

/** The current list of files driving the grid + viewer. */
export const getFiles = (): readonly FileDescriptor[] => CURRENT;

/** Look up a file by id. */
export const fileById = (id: string | undefined): FileDescriptor | undefined =>
  CURRENT.find((file) => file.id === id);

/** Index of a file id within the current file list (-1 when absent). */
export const indexOfFile = (id: string | undefined): number =>
  CURRENT.findIndex((file) => file.id === id);
