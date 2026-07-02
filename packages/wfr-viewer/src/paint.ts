import type { PageContent } from '@web-file-reader/core';

/** A function that tears down whatever {@link paintContent} created. */
export type Cleanup = () => void;

const noop: Cleanup = () => {};

/**
 * Render a single page's content into `container`, returning a cleanup to run
 * before re-painting or disconnecting.
 *
 * `html` content is treated as **already sanitized** — sanitization is part of
 * each provider's contract, keeping the viewer free of a sanitizer dependency.
 */
export const paintContent = (container: HTMLElement, content: PageContent): Cleanup => {
  switch (content.kind) {
    case 'html':
      container.innerHTML = content.html;
      return noop;
    case 'node':
      container.replaceChildren(content.node);
      return noop;
    case 'mount': {
      const cleanup = content.mount(container);
      return typeof cleanup === 'function' ? cleanup : noop;
    }
  }
};
