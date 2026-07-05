import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import {
  contentPages,
  type FileDescriptor,
  type ProviderRegistry,
  type ProviderSettings,
  type ViewerContent,
} from '@web-file-reader/core';
import { paintContent, type Cleanup } from './paint';
import { WFR_VIEWER_ERROR, WFR_VIEWER_LOAD } from './viewer-events';

export type ViewerMode = 'normal' | 'fullscreen';
export type ViewerState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Headless file viewer. Resolves a provider for `file` from `registry`, lazily
 * loads it, renders the resulting content into a scrollable surface, and
 * supports normal/fullscreen modes. Pages are painted imperatively so providers
 * may emit HTML strings, DOM nodes, or imperative mounts (e.g. canvas).
 */
@customElement('wfr-viewer')
export class WfrViewer extends LitElement {
  static override styles = css`
    /* The page reset (* { box-sizing: border-box }) does NOT cross the shadow
       boundary, so without this a host-padded ::part(page) (inline-size:100% +
       padding) becomes wider than its container and its right edge — and the
       content in it — is clipped on narrow viewports. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    :host {
      display: block;
      block-size: 100%;
    }
    [part='root'] {
      display: flex;
      flex-direction: column;
      block-size: 100%;
    }
    [part='surface'] {
      position: relative;
      flex: 1 1 auto;
      min-block-size: 0;
      overflow: auto;
      /* Contain only the BLOCK (vertical) axis so a vertical scroll never leaks
         to the page behind a modal. The inline (horizontal) axis must chain to
         an ancestor — e.g. a carousel track — so a horizontal swipe over the
         content can still page. Containing both axes silently ate swipes. */
      overscroll-behavior-block: contain;
    }
    [part='surface']:focus-visible {
      outline: var(--wfr-focus-outline, 2px solid currentColor);
      outline-offset: -2px;
    }
    [part='pages'] {
      display: flex;
      flex-direction: column;
      gap: var(--wfr-page-gap, 1rem);
    }
    /* Overflow-safe defaults for provider-rendered content (lives in this
       shadow tree, so host ::part(page) descendant selectors cannot reach it).
       Media never exceeds the page width; wide blocks scroll instead. */
    [part='pages'] :is(img, canvas, svg, video) {
      max-inline-size: 100%;
      block-size: auto;
    }
    /* Wrap long code lines instead of clipping them: on a phone a horizontal
       scrollbar is invisible, so an unwrapped <pre> looks cut off at the card
       edge. pre-wrap keeps indentation; overflow-wrap breaks long tokens. */
    [part='pages'] pre {
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    [part='pages'] table {
      border-collapse: collapse;
      max-inline-size: 100%;
    }
    [part='pages'] :is(th, td) {
      border: var(--wfr-cell-border, 1px solid color-mix(in srgb, currentColor 20%, transparent));
      padding: var(--wfr-cell-padding, 0.35rem 0.6rem);
      text-align: start;
    }
    [part='loading'],
    [part='error'] {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      /* Opaque so the indicator never overlaps the previous page during a load. */
      background: var(--wfr-overlay-bg, Canvas);
    }
    /* CSS fallback when the Fullscreen API is unavailable. */
    :host([mode='fullscreen']) {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: var(--wfr-fullscreen-bg, Canvas);
    }
  `;

  /** The file to display. */
  @property({ attribute: false }) file: FileDescriptor | undefined = undefined;

  /** Provider registry used to resolve and lazily load a renderer. */
  @property({ attribute: false }) registry: ProviderRegistry | undefined = undefined;

  /** Provider settings, merged over the provider's defaults. */
  @property({ attribute: false }) settings: ProviderSettings = {};

  /** Current display mode (reflected for styling). */
  @property({ reflect: true }) mode: ViewerMode = 'normal';

  /** Current load state (reflected for styling). */
  @property({ reflect: true }) state: ViewerState = 'idle';

  @state() private errorMessage = '';

  readonly #pagesRef: Ref<HTMLElement> = createRef();
  #token = 0;
  #content: ViewerContent | undefined = undefined;
  #cleanups: Cleanup[] = [];

  /** The currently rendered content, if any. */
  get content(): ViewerContent | undefined {
    return this.#content;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('fullscreenchange', this.#onFullscreenChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this.#onFullscreenChange);
    this.#runCleanups();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('file') || changed.has('registry') || changed.has('settings')) {
      void this.#load();
    }
  }

  override render(): TemplateResult {
    return html`
      <div part="root">
        <slot name="toolbar"></slot>
        <div
          part="surface"
          tabindex="0"
          role="region"
          aria-label=${this.#regionLabel()}
          aria-busy=${this.state === 'loading' ? 'true' : 'false'}
        >
          <div part="pages" ${ref(this.#pagesRef)}></div>
          ${this.#overlay()}
        </div>
        <slot name="controls"></slot>
      </div>
    `;
  }

  /** Enter fullscreen via the Fullscreen API, falling back to CSS mode. */
  async enterFullscreen(): Promise<void> {
    if (typeof this.requestFullscreen === 'function') {
      try {
        await this.requestFullscreen();
        return;
      } catch {
        /* fall through to CSS fallback */
      }
    }
    this.mode = 'fullscreen';
  }

  /** Exit fullscreen. */
  async exitFullscreen(): Promise<void> {
    if (document.fullscreenElement === this && typeof document.exitFullscreen === 'function') {
      try {
        await document.exitFullscreen();
        return;
      } catch {
        /* fall through */
      }
    }
    this.mode = 'normal';
  }

  /** Toggle between normal and fullscreen. */
  toggleFullscreen(): Promise<void> {
    return this.mode === 'fullscreen' ? this.exitFullscreen() : this.enterFullscreen();
  }

  #overlay(): TemplateResult | typeof nothing {
    switch (this.state) {
      case 'loading':
        return html`<slot name="loading"><div part="loading" aria-hidden="true">Loading…</div></slot>`;
      case 'error':
        return html`<slot name="error"><div part="error" role="alert">${this.errorMessage}</div></slot>`;
      default:
        return nothing;
    }
  }

  #regionLabel(): string {
    return this.file === undefined ? 'File viewer' : `Viewing ${this.file.name}`;
  }

  async #load(): Promise<void> {
    const token = ++this.#token;
    const file = this.file;
    const registry = this.registry;
    this.#runCleanups();
    if (file === undefined || registry === undefined) {
      this.#content = undefined;
      this.state = 'idle';
      this.#clearPages();
      return;
    }
    this.state = 'loading';
    this.errorMessage = '';
    try {
      const providerModule = await registry.load(file);
      if (token !== this.#token) return;
      if (providerModule === undefined) throw new Error(`No provider can open "${file.name}".`);
      const merged: ProviderSettings = { ...providerModule.defaultSettings, ...this.settings };
      const content = await providerModule.render(file, merged);
      if (token !== this.#token) return;
      this.#content = content;
      this.state = 'ready';
      await this.updateComplete;
      if (token !== this.#token) return;
      this.#paint();
      this.dispatchEvent(
        new CustomEvent(WFR_VIEWER_LOAD, { detail: { file, content }, bubbles: true, composed: true }),
      );
    } catch (error) {
      if (token !== this.#token) return;
      const err = error instanceof Error ? error : new Error(String(error));
      this.#content = undefined;
      this.#clearPages();
      this.errorMessage = err.message;
      this.state = 'error';
      this.dispatchEvent(
        new CustomEvent(WFR_VIEWER_ERROR, { detail: { file, error: err }, bubbles: true, composed: true }),
      );
    }
  }

  #paint(): void {
    const container = this.#pagesRef.value;
    if (container === undefined) return;
    container.replaceChildren();
    const content = this.#content;
    if (content === undefined) return;
    for (const page of contentPages(content)) {
      const pageEl = document.createElement('div');
      pageEl.setAttribute('part', 'page');
      pageEl.dataset['pageId'] = page.id;
      if (page.label !== undefined) pageEl.setAttribute('aria-label', page.label);
      container.append(pageEl);
      this.#cleanups.push(paintContent(pageEl, page.content));
    }
  }

  #clearPages(): void {
    this.#pagesRef.value?.replaceChildren();
  }

  #runCleanups(): void {
    for (const cleanup of this.#cleanups) cleanup();
    this.#cleanups = [];
  }

  #onFullscreenChange = (): void => {
    this.mode = document.fullscreenElement === this ? 'fullscreen' : 'normal';
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'wfr-viewer': WfrViewer;
  }
}
