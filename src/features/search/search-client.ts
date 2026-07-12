import type { PreparedIndex, SearchHit } from '@prometheus/search-core';
import { prepare, search } from '@prometheus/search-core';
import { searchStrings } from './i18n';
import { renderHits } from './render-list';

/*
 * The index is the largest thing this site serves, and most visits never
 * search — so it is fetched on the FIRST keystroke, not on page load, and
 * the prepared result is cached at module scope. `<ClientRouter />` swaps
 * the DOM on every navigation but keeps the module graph, so the cache
 * survives; hanging it off a DOM node would not.
 */
const cache = new Map<string, Promise<PreparedIndex>>();

const DEBOUNCE_MS = 120;
const MAX_HITS = 8;

const loadIndex = (lang: string): Promise<PreparedIndex> => {
  const hit = cache.get(lang);
  if (hit !== undefined) return hit;
  const pending = fetch(`/${lang}/search-index.json`)
    .then((res) => res.json())
    .then(prepare)
    .catch((error: unknown) => {
      /*
       * A rejected promise left in the cache would be handed to every
       * later keystroke — one flaky fetch and search is dead until the
       * page is reloaded. Drop it so the next attempt starts clean.
       */
      cache.delete(lang);
      throw error;
    });
  cache.set(lang, pending);
  return pending;
};

/* Fire-and-forget: a failed index leaves the box inert, never throwing. */
const ignore = (): undefined => undefined;

interface Refs {
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly panel: HTMLElement;
  readonly list: HTMLElement;
  readonly empty: HTMLElement;
  readonly status: HTMLElement;
}

const refsOf = (form: HTMLFormElement): Refs | undefined => {
  const input = form.querySelector<HTMLInputElement>('[data-search-input]');
  const panel = form.querySelector<HTMLElement>('[data-search-panel]');
  const list = form.querySelector<HTMLElement>('[data-search-list]');
  const empty = form.querySelector<HTMLElement>('[data-search-empty]');
  const status = form.querySelector<HTMLElement>('[data-search-status]');
  if (!input || !panel || !list || !empty || !status) return undefined;
  return { form, input, panel, list, empty, status };
};

const close = (r: Refs): void => {
  r.panel.hidden = true;
  r.input.setAttribute('aria-expanded', 'false');
  r.input.removeAttribute('aria-activedescendant');
};

const activeOption = (r: Refs): HTMLElement | null =>
  r.list.querySelector<HTMLElement>('[aria-selected="true"]');

const move = (r: Refs, delta: number): void => {
  const options = [...r.list.querySelectorAll<HTMLElement>('[role="option"]')];
  if (options.length === 0) return;
  const current = activeOption(r);
  const at = current === null ? -1 : options.indexOf(current);
  const next = options[(at + delta + options.length) % options.length];
  if (next === undefined) return;
  for (const option of options) option.setAttribute('aria-selected', 'false');
  next.setAttribute('aria-selected', 'true');
  r.input.setAttribute('aria-activedescendant', next.id);
  next.scrollIntoView({ block: 'nearest' });
};

const show = (r: Refs, lang: string, hits: readonly SearchHit[]): void => {
  const t = searchStrings(lang);
  renderHits(r.list, hits, t.sections);
  r.empty.hidden = hits.length > 0;
  r.panel.hidden = false;
  r.input.setAttribute('aria-expanded', 'true');
  r.input.removeAttribute('aria-activedescendant');
  r.status.textContent = hits.length === 0 ? t.noResults : `${hits.length}`;
};

const run = async (r: Refs, lang: string): Promise<void> => {
  const query = r.input.value.trim();
  if (query === '') {
    close(r);
    return;
  }
  const index = await loadIndex(lang);
  /* The reader kept typing while the index was in flight — that run wins. */
  if (r.input.value.trim() !== query) return;
  show(r, lang, search(index, query, MAX_HITS));
};

const onKeydown = (event: KeyboardEvent, r: Refs): void => {
  if (event.key === 'Escape') {
    close(r);
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    move(r, event.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (event.key !== 'Enter') return;
  const selected = activeOption(r)?.querySelector('a');
  /* No selection: let the form submit and land on the full results page. */
  if (selected === null || selected === undefined) return;
  event.preventDefault();
  selected.click();
};

/**
 * Upgrade a search form into a live combobox. Idempotent — re-runs on
 * every view transition, and re-wiring a form it already owns is a no-op.
 * @param form The `<form data-search>` element.
 */
export const setupSearch = (form: HTMLFormElement): void => {
  /*
   * Attributes, not `dataset`: TypeScript wants bracket access on an index
   * signature and Biome wants dot access, and they cannot both be right.
   * `getAttribute` sidesteps the argument entirely.
   */
  if (form.getAttribute('data-search-init') === 'true') return;
  const r = refsOf(form);
  if (r === undefined) return;
  form.setAttribute('data-search-init', 'true');
  const lang = form.getAttribute('data-lang') ?? 'en';

  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  r.input.addEventListener('input', () => {
    globalThis.clearTimeout(timer);
    timer = globalThis.setTimeout(() => {
      run(r, lang).catch(ignore);
    }, DEBOUNCE_MS);
  });
  r.input.addEventListener('keydown', (event) => onKeydown(event, r));
  r.input.addEventListener('focus', () => {
    loadIndex(lang).catch(ignore);
  });
  document.addEventListener('click', (event) => {
    if (!form.contains(event.target as Node)) close(r);
  });
};
