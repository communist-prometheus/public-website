import { css, html, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { FileDescriptor } from '@web-file-reader/core';
import './wfr-file-tile';

/**
 * A headless grid of {@link WfrFileTile}s built from a `files` array. The grid
 * itself is an accessible list; each tile dispatches a bubbling `wfr-open`
 * event the host can listen for. Layout is a CSS grid driven by custom
 * properties so it is fully restyleable; an `empty` slot covers the no-files case.
 */
@customElement('wfr-file-grid')
export class WfrFileGrid extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    [part='grid'] {
      display: grid;
      grid-template-columns: var(
        --wfr-grid-columns,
        repeat(auto-fill, minmax(var(--wfr-grid-min, 8rem), 1fr))
      );
      gap: var(--wfr-grid-gap, 1rem);
    }
  `;

  /** The files to render as tiles. */
  @property({ attribute: false }) files: readonly FileDescriptor[] = [];

  /** Accessible label for the grid list. */
  @property({ type: String }) label = 'Files';

  override render(): TemplateResult {
    const files = this.files;
    if (files.length === 0) {
      return html`<slot name="empty"></slot>`;
    }
    return html`
      <div part="grid" role="list" aria-label=${this.label}>
        ${repeat(
          files,
          (file) => file.id,
          (file, index) => this.#renderTile(file, index),
        )}
      </div>
      <slot></slot>
    `;
  }

  #renderTile(file: FileDescriptor, index: number): TemplateResult {
    return html`
      <wfr-file-tile part="tile" role="listitem" .file=${file} .index=${index}></wfr-file-tile>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wfr-file-grid': WfrFileGrid;
  }
}
