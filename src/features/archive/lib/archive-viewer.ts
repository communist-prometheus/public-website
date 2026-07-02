/*
 * Archive lightbox powered by web-file-reader.
 *
 * SSR emits the tiles (SEO / no-JS friendly), each tile carries its
 * FileDescriptor serialised on `data-wfr-file`. This module wires:
 *   - clicks on `[data-archive-item]` → open the shared viewer
 *   - prev / next / close / download UI
 *   - deep-link via `#asset=<name>` (Back button closes)
 *   - swipe navigation
 *
 * The viewer itself is `<wfr-viewer>` from @web-file-reader/viewer, fed a
 * `FileDescriptor` and a provider registry; the heavy per-type renderers
 * are downloaded lazily by the registry on first use of each provider.
 */

import '@web-file-reader/viewer';
import type { FileDescriptor } from '@web-file-reader/core';
import type { WfrViewer } from '@web-file-reader/viewer';
import { getRegistry } from '@/features/archive/lib/registry';

const HASH_KEY = 'asset';
const SWIPE_THRESHOLD = 60;

interface ArchiveItem {
  readonly file: FileDescriptor;
  readonly trigger: HTMLButtonElement;
}

interface Viewer {
  readonly dialog: HTMLDialogElement;
  readonly stage: HTMLElement;
  readonly wfrViewer: WfrViewer;
  readonly counter: HTMLElement;
  readonly live: HTMLElement;
  readonly download: HTMLAnchorElement;
  readonly prevBtn: HTMLButtonElement;
  readonly nextBtn: HTMLButtonElement;
  readonly fullscreenBtn: HTMLButtonElement;
}

interface Session {
  items: ReadonlyArray<ArchiveItem>;
  index: number;
  invoker: HTMLButtonElement | undefined;
}

const registry = getRegistry();

const prefersReducedMotion = (): boolean =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const fullscreenSupported = (): boolean =>
  document.fullscreenEnabled === true && typeof Element.prototype.requestFullscreen === 'function';

/*
 * Fullscreen is pointless on touch devices — the modal already fills the
 * viewport and the Fullscreen API is flaky/absent there. Show the toggle
 * only with a fine pointer (desktop), so mobile never gets a dead button.
 */
const fullscreenUseful = (): boolean =>
  fullscreenSupported() && globalThis.matchMedia?.('(pointer: coarse)').matches !== true;

const makeButton = (className: string, label: string, glyph: string): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `<span aria-hidden="true">${glyph}</span>`;
  return btn;
};

const makeDownload = (className: string, label: string, glyph: string): HTMLAnchorElement => {
  const a = document.createElement('a');
  a.className = className;
  a.setAttribute('download', '');
  a.setAttribute('aria-label', label);
  a.innerHTML = `<span aria-hidden="true">${glyph}</span>`;
  return a;
};

const buildViewer = (): Viewer => {
  const dialog = document.createElement('dialog');
  dialog.className = 'archive-viewer';
  if (prefersReducedMotion()) dialog.setAttribute('data-reduced-motion', 'true');

  const wfrViewer = document.createElement('wfr-viewer');
  wfrViewer.className = 'archive-viewer-wfr';

  const counter = document.createElement('span');
  counter.className = 'archive-viewer-counter';
  counter.setAttribute('aria-hidden', 'true');

  const live = document.createElement('p');
  live.className = 'archive-viewer-live';
  live.setAttribute('aria-live', 'polite');

  const download = makeDownload('archive-viewer-download', 'Download current file', '⤓');
  const closeBtn = makeButton('archive-viewer-close', 'Close viewer', '✕');
  const prevBtn = makeButton('archive-viewer-prev', 'Previous file', '‹');
  const nextBtn = makeButton('archive-viewer-next', 'Next file', '›');
  const fullscreenBtn = makeButton('archive-viewer-fullscreen', 'Toggle fullscreen', '⛶');

  const bar = document.createElement('div');
  bar.className = 'archive-viewer-bar';
  bar.append(counter, download, ...(fullscreenUseful() ? [fullscreenBtn] : []), closeBtn);

  const content = document.createElement('div');
  content.className = 'archive-viewer-content';
  content.append(wfrViewer);

  const stage = document.createElement('figure');
  stage.className = 'archive-viewer-stage';
  stage.append(prevBtn, content, nextBtn);

  dialog.append(bar, stage, live);
  document.body.append(dialog);

  closeBtn.addEventListener('click', () => dialog.close());

  return { dialog, stage, wfrViewer, counter, live, download, prevBtn, nextBtn, fullscreenBtn };
};

let viewer: Viewer | undefined;
let activeItems: ReadonlyArray<ArchiveItem> = [];
let programmaticClose = false;
/*
 * True when THIS open pushed a history entry (tile click) — so closing
 * pops it. A deep-link open adds no entry, so closing just strips the
 * hash in place instead of navigating off the page.
 */
let pushedOpen = false;
const session: Session = { items: [], index: 0, invoker: undefined };

const getViewer = (): Viewer => {
  if (!viewer) viewer = buildViewer();
  /*
   * The module persists across ClientRouter view transitions, but the
   * <body> we appended to is swapped away — re-attach to the live body
   * so showModal() never throws "element is not in a Document".
   */
  if (!viewer.dialog.isConnected) document.body.append(viewer.dialog);
  return viewer;
};

const currentFile = (): FileDescriptor | undefined => session.items[session.index]?.file;

const render = (v: Viewer): void => {
  const item = session.items[session.index];
  if (!item) return;
  const total = session.items.length;
  const position = session.index + 1;
  v.counter.textContent = `${position} / ${total}`;
  v.live.textContent = `File ${position} of ${total}`;
  /*
   * aria-disabled (not the `disabled` property) so the arrow stays in
   * the tab order and can be revealed on focus instead of vanishing.
   */
  v.prevBtn.setAttribute('aria-disabled', String(session.index === 0));
  v.nextBtn.setAttribute('aria-disabled', String(session.index === total - 1));
  if (item.file.source.kind === 'url') {
    v.download.href = item.file.source.url;
  } else {
    v.download.removeAttribute('href');
  }
  v.wfrViewer.registry = registry;
  v.wfrViewer.file = item.file;
};

const canGo = (delta: number): boolean => {
  const next = session.index + delta;
  return next >= 0 && next < session.items.length;
};

const setHash = (name: string, push: boolean): void => {
  const url = `#${HASH_KEY}=${encodeURIComponent(name)}`;
  if (push) history.pushState(null, '', url);
  else history.replaceState(null, '', url);
};

const clearHash = (): void => {
  if (assetFromHash() !== undefined) {
    history.replaceState(null, '', location.pathname + location.search);
  }
};

const assetFromHash = (): string | undefined => {
  const match = location.hash.match(/(?:^#|&)asset=([^&]+)/);
  return match ? decodeURIComponent(match[1] ?? '') : undefined;
};

/*
 * Slide + fade the pane in from the travel direction. Re-triggerable:
 * clear the class, then re-add it after two frames so the same animation
 * replays on every step. Scoped to the stage — no top-layer View
 * Transition, which janks inside a modal <dialog>.
 */
const animatePane = (v: Viewer, dir: number): void => {
  if (prefersReducedMotion()) return;
  const cls = dir > 0 ? 'archive-anim-next' : 'archive-anim-prev';
  const holder = v.stage.querySelector<HTMLElement>('.archive-viewer-content');
  if (!holder) return;
  holder.classList.remove('archive-anim-next', 'archive-anim-prev');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => holder.classList.add(cls));
  });
};

/*
 * Move to a neighbouring item, mirror it into the URL hash, and animate
 * the pane in the travel direction.
 */
const navigate = (delta: number): void => {
  if (!canGo(delta)) return;
  session.index += delta;
  const target = currentFile()?.name;
  if (target !== undefined) setHash(target, false);
  const v = getViewer();
  render(v);
  animatePane(v, delta);
};

const exitFullscreen = (): void => {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => undefined);
  }
};

const toggleFullscreen = (v: Viewer): void => {
  if (document.fullscreenElement) {
    exitFullscreen();
    return;
  }
  /* Graceful no-op when the browser rejects (e.g. permissions, iOS). */
  v.dialog.requestFullscreen?.().catch(() => undefined);
};

const onKeydown = (event: KeyboardEvent): void => {
  if (!viewer?.dialog.open) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    navigate(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    navigate(1);
  } else if (event.key === 'Escape' && document.fullscreenElement) {
    /* Exit fullscreen first; a second Escape closes the dialog. */
    event.preventDefault();
    exitFullscreen();
  }
};

/*
 * A horizontal flick past the threshold navigates.
 */
const wireSwipe = (v: Viewer): void => {
  const holder = v.stage.querySelector<HTMLElement>('.archive-viewer-content');
  if (!holder) return;
  let startX: number | undefined;
  holder.addEventListener('pointerdown', (e: PointerEvent) => {
    startX = e.clientX;
  });
  holder.addEventListener('pointercancel', () => {
    startX = undefined;
  });
  holder.addEventListener('pointerup', (e: PointerEvent) => {
    if (startX === undefined) return;
    const dx = e.clientX - startX;
    startX = undefined;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    navigate(dx < 0 ? 1 : -1);
  });
};

const open = (items: ReadonlyArray<ArchiveItem>, index: number, fromUrl: boolean): void => {
  const v = getViewer();
  session.items = items;
  session.index = index;
  session.invoker = items[index]?.trigger;
  render(v);
  if (!v.dialog.open) v.dialog.showModal();
  const name = items[index]?.file.name;
  if (!fromUrl && name !== undefined) {
    setHash(name, true);
    pushedOpen = true;
  } else {
    pushedOpen = false;
  }
};

const onPopState = (): void => {
  const name = assetFromHash();
  const v = getViewer();
  if (name !== undefined) {
    const index = activeItems.findIndex((item) => item.file.name === name);
    if (index < 0) return;
    if (!v.dialog.open) open(activeItems, index, true);
    else if (index !== session.index) {
      session.index = index;
      render(v);
    }
  } else if (v.dialog.open) {
    programmaticClose = true;
    v.dialog.close();
    programmaticClose = false;
  }
};

const parseFileDescriptor = (raw: string | null): FileDescriptor | undefined => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as FileDescriptor;
  } catch {
    return undefined;
  }
};

const collectItems = (gallery: HTMLElement): ReadonlyArray<ArchiveItem> =>
  [...gallery.querySelectorAll<HTMLButtonElement>('[data-archive-item]')].flatMap((trigger) => {
    const file = parseFileDescriptor(trigger.getAttribute('data-wfr-file'));
    return file === undefined ? [] : [{ file, trigger }];
  });

const wireViewerOnce = (v: Viewer): void => {
  v.prevBtn.addEventListener('click', () => navigate(-1));
  v.nextBtn.addEventListener('click', () => navigate(1));
  v.fullscreenBtn.addEventListener('click', () => toggleFullscreen(v));
  const holder = v.stage.querySelector<HTMLElement>('.archive-viewer-content');
  if (holder) {
    holder.addEventListener('animationend', () => {
      holder.classList.remove('archive-anim-next', 'archive-anim-prev');
    });
  }
  v.dialog.addEventListener('close', () => {
    exitFullscreen();
    session.invoker?.focus();
    if (programmaticClose) return;
    if (pushedOpen) history.back();
    else clearHash();
  });
  wireSwipe(v);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('popstate', onPopState);
};

/**
 * Initialise every archive gallery on the page. Idempotent: galleries
 * already wired (and the shared viewer) are skipped, so it is safe to
 * call on first load and after Astro view transitions.
 */
export const initArchiveViewer = (): void => {
  const galleries = document.querySelectorAll<HTMLElement>('[data-archive-gallery]');
  if (galleries.length === 0) return;

  const v = getViewer();
  if (v.dialog.getAttribute('data-wired') !== 'true') {
    v.dialog.setAttribute('data-wired', 'true');
    wireViewerOnce(v);
  }

  /*
   * The first gallery on the page drives URL deep-links; refresh it each
   * run so navigating between archive pages tracks the live DOM.
   */
  const first = galleries[0];
  if (first) activeItems = collectItems(first);

  galleries.forEach((gallery) => {
    if (gallery.getAttribute('data-archive-wired') === 'true') return;
    gallery.setAttribute('data-archive-wired', 'true');
    const items = collectItems(gallery);
    items.forEach((item, index) => {
      item.trigger.addEventListener('click', () => open(items, index, false));
    });
  });

  /* Deep link: open the item named in the URL hash on load. */
  const initial = assetFromHash();
  if (initial !== undefined) {
    const index = activeItems.findIndex((item) => item.file.name === initial);
    if (index >= 0) open(activeItems, index, true);
  }
};
