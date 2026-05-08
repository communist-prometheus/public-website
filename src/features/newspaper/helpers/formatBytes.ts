const KB = 1024;
const MB = KB * 1024;

const fmt = (v: number, frac: number, unit: string): string => `${v.toFixed(frac)} ${unit}`;

/**
 * Format a byte count for human-readable file size next to a
 * download button (e.g. "2.0 MB", "118 KB", "612 B"). Single
 * decimal for MB, integer for KB and bytes — keeps the label
 * compact without lying about precision.
 *
 * @param bytes - Raw byte size from `fs.statSync`
 * @returns Compact human-readable size string
 */
export const formatBytes = (bytes: number): string =>
  bytes >= MB
    ? fmt(bytes / MB, 1, 'MB')
    : bytes >= KB
      ? fmt(bytes / KB, 0, 'KB')
      : fmt(bytes, 0, 'B');
