/**
 * A file to be presented in the grid and opened in the viewer.
 *
 * The descriptor is intentionally lightweight: the actual content is resolved
 * lazily through {@link FileSource} so a grid of hundreds of files stays cheap.
 */
export interface FileDescriptor {
  /** Stable, unique identifier — also used as the viewer route segment. */
  readonly id: string;
  /** Human-readable file name shown in the grid tile. */
  readonly name: string;
  /** MIME type, when known (e.g. `application/pdf`). */
  readonly mimeType?: string;
  /** Lower-case extension without the dot (e.g. `md`), when known. */
  readonly extension?: string;
  /** Where the bytes/text live. Resolved lazily by providers. */
  readonly source: FileSource;
  /** Optional URL of a small preview/thumbnail for the grid tile. */
  readonly previewIconUrl?: string;
  /** Size in bytes, when known. */
  readonly size?: number;
}

/** Discriminated union describing how a file's content can be obtained. */
export type FileSource =
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'bytes'; readonly bytes: Uint8Array }
  | { readonly kind: 'blob'; readonly blob: Blob };

/**
 * Derive the lower-case extension for a file, preferring the explicit field and
 * falling back to the name. Returns undefined when none can be determined.
 */
export const fileExtension = (file: FileDescriptor): string | undefined => {
  switch (file.extension === undefined) {
    case false:
      return file.extension?.toLowerCase();
    default: {
      const dot = file.name.lastIndexOf('.');
      switch (dot > 0 && dot < file.name.length - 1) {
        case true:
          return file.name.slice(dot + 1).toLowerCase();
        default:
          return undefined;
      }
    }
  }
};
