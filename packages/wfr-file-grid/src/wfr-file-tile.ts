import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FileDescriptor } from '@web-file-reader/core';
import { createOpenEvent } from './open-event';

/**
 * A single, headless file tile. Renders an accessible button exposing `icon`,
 * `label` and `preview` slots (with sensible defaults) plus styling `part`s.
 * Activating it dispatches a bubbling, composed `wfr-open` event.
 */
@customElement('wfr-file-tile')
export class WfrFileTile extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    button {
      all: unset;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--wfr-tile-gap, 0.5rem);
      width: 100%;
      cursor: pointer;
    }
    button:focus-visible {
      outline: var(--wfr-focus-outline, 2px solid currentColor);
      outline-offset: var(--wfr-focus-offset, 2px);
    }
    [part='preview'] {
      display: grid;
      place-items: center;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  `;

  /** The file represented by this tile. */
  @property({ attribute: false }) file: FileDescriptor | undefined = undefined;

  /** Index of this tile within its grid. Forwarded in the open event. */
  @property({ type: Number }) index = -1;

  override render(): typeof nothing | TemplateResult {
    const file = this.file;
    if (file === undefined) return nothing;
    return html`
      <button part="button" type="button" @click=${this.#open} aria-label=${file.name}>
        <span part="preview">
          <slot name="preview">${this.#defaultPreview(file)}</slot>
        </span>
        <span part="label">
          <slot name="label">${file.name}</slot>
        </span>
      </button>
    `;
  }

  #defaultPreview(file: FileDescriptor): TemplateResult {
    if (file.previewIconUrl !== undefined) {
      return html`<img part="icon" src=${file.previewIconUrl} alt="" loading="lazy" decoding="async" />`;
    }
    return html`<slot name="icon"><span part="icon" aria-hidden="true">📄</span></slot>`;
  }

  #open = (): void => {
    if (this.file === undefined) return;
    this.dispatchEvent(createOpenEvent({ file: this.file, index: this.index }));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'wfr-file-tile': WfrFileTile;
  }
}
