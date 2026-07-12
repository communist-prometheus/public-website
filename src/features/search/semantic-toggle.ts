import type { SearchDoc, SearchHit } from '@prometheus/search-core';
import type { SearchStrings } from './i18n';
import { renderPage } from './page-view';
import { semanticSearch } from './semantic-client';

/*
 * "Search by meaning" is a button, not a mode the reader falls into.
 *
 * Word search is instant and free; this one costs a round trip and a
 * model call, so it happens when it is asked for. Pressing again gives
 * the word results back — the reader can always get out, and the exact
 * hits are still in memory, so getting out is free too.
 */

/** Everything the toggle needs to answer a press. */
export interface SemanticContext {
  readonly root: HTMLElement;
  readonly status: HTMLElement;
  readonly t: SearchStrings;
  readonly lang: string;
  readonly query: string;
  readonly docs: readonly SearchDoc[];
  /** The word-search hits already on screen, to restore on release. */
  readonly exact: readonly SearchHit[];
}

const setPressed = (button: HTMLButtonElement, on: boolean): void => {
  button.setAttribute('aria-pressed', String(on));
};

const showExact = (button: HTMLButtonElement, ctx: SemanticContext): void => {
  setPressed(button, false);
  ctx.status.textContent = '';
  renderPage(ctx.root, ctx.t, ctx.exact, ctx.t.exactTitle);
};

const showMeaning = async (button: HTMLButtonElement, ctx: SemanticContext): Promise<void> => {
  button.disabled = true;
  ctx.status.textContent = ctx.t.semanticBusy;
  try {
    const hits = await semanticSearch(ctx.lang, ctx.query, ctx.docs);
    setPressed(button, true);
    ctx.status.textContent = ctx.t.semanticTitle;
    renderPage(ctx.root, ctx.t, hits, ctx.t.semanticTitle);
  } catch {
    /*
     * Rate-limited, offline, or the model is down. Say so and leave the
     * word results exactly where they were — a blank page would look
     * like "nothing matched", which is a different and false claim.
     */
    ctx.status.textContent = ctx.t.semanticError;
  } finally {
    button.disabled = false;
  }
};

/**
 * Wire the meaning-search button.
 * @param button The toggle.
 * @param ctx What it needs to answer a press.
 */
export const setupSemanticToggle = (button: HTMLButtonElement, ctx: SemanticContext): void => {
  button.hidden = false;
  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') === 'true';
    if (on) {
      showExact(button, ctx);
      return;
    }
    showMeaning(button, ctx).catch(() => undefined);
  });
};
