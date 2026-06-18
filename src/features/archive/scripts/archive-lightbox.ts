/*
 * Framework-free progressive-enhancement lightbox for archive
 * galleries. No Vue/React/Astro-island — plain DOM. Each gallery is a
 * `[data-archive-gallery]` container whose `<button data-archive-item>`
 * tiles carry `data-kind` (image|file), `data-name`, `data-download`
 * and, for images, `data-full` (optimised large image URL). Clicking a
 * tile opens a single shared <dialog> overlay that navigates across the
 * whole gallery.
 *
 * Rendering: images render inline; text / pdf / docx render inline via
 * the lazily-imported `archive-renderers` chunk (heavy code arrives only
 * on an archive page, and only when a document is opened — a spinner
 * covers the load); anything else falls back to a pictogram + download.
 *
 * URL-driven: the open item lives in the `#asset=<name>` hash, so the
 * view is deep-linkable and the Back button closes it.
 *
 * Accessibility: native `dialog.showModal()` provides the focus trap;
 * we restore focus to the invoking tile on close, announce the current
 * position via a polite live region, and wire ArrowLeft/Right + Escape.
 * A horizontal flick navigates; the visual is a scoped slide animation
 * on the pane (no top-layer View Transition, which janks in a dialog).
 */

import type { DocKind } from './archive-renderers';

const SWIPE_THRESHOLD = 60;
const HASH_KEY = 'asset';
const TEXT_EXTS: ReadonlySet<string> = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'tsv',
  'log',
  'json',
  'xml',
  'yml',
  'yaml',
]);

type ViewerMode = 'image' | DocKind | 'other';

interface GalleryItem {
  readonly kind: 'image' | 'file';
  readonly name: string;
  readonly download: string;
  readonly ext: string;
  /** Optimised large image URL; undefined for non-image files. */
  readonly full: string | undefined;
  readonly trigger: HTMLButtonElement;
}

interface Viewer {
  readonly dialog: HTMLDialogElement;
  readonly stage: HTMLElement;
  readonly content: HTMLElement;
  readonly image: HTMLImageElement;
  readonly doc: HTMLElement;
  readonly filePanel: HTMLElement;
  readonly fileExt: HTMLElement;
  readonly fileName: HTMLElement;
  readonly fileDownload: HTMLAnchorElement;
  readonly download: HTMLAnchorElement;
  readonly counter: HTMLElement;
  readonly live: HTMLElement;
  readonly prevBtn: HTMLButtonElement;
  readonly nextBtn: HTMLButtonElement;
  readonly fullscreenBtn: HTMLButtonElement;
}

interface Session {
  items: ReadonlyArray<GalleryItem>;
  index: number;
  invoker: HTMLButtonElement | undefined;
}

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

const viewerMode = (item: GalleryItem): ViewerMode => {
  if (item.kind === 'image') return 'image';
  const ext = item.ext.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (TEXT_EXTS.has(ext)) return 'text';
  return 'other';
};

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

const buildFilePanel = (): {
  panel: HTMLElement;
  ext: HTMLElement;
  name: HTMLElement;
  download: HTMLAnchorElement;
} => {
  const panel = document.createElement('div');
  panel.className = 'archive-viewer-file';
  panel.hidden = true;
  const ext = document.createElement('span');
  ext.className = 'archive-viewer-file-ext';
  ext.setAttribute('aria-hidden', 'true');
  const name = document.createElement('p');
  name.className = 'archive-viewer-file-name';
  const download = document.createElement('a');
  download.className = 'archive-viewer-file-download';
  download.setAttribute('download', '');
  download.textContent = 'Download';
  panel.append(ext, name, download);
  return { panel, ext, name, download };
};

const buildViewer = (): Viewer => {
  const dialog = document.createElement('dialog');
  dialog.className = 'archive-viewer';
  if (prefersReducedMotion()) dialog.setAttribute('data-reduced-motion', 'true');

  const image = document.createElement('img');
  image.className = 'archive-viewer-image';
  image.draggable = false;
  image.alt = '';
  image.decoding = 'async';

  const doc = document.createElement('div');
  doc.className = 'archive-viewer-doc';
  doc.hidden = true;

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

  const {
    panel: filePanel,
    ext: fileExt,
    name: fileName,
    download: fileDownload,
  } = buildFilePanel();

  const content = document.createElement('div');
  content.className = 'archive-viewer-content';
  content.append(image, doc, filePanel);

  const stage = document.createElement('figure');
  stage.className = 'archive-viewer-stage';
  stage.append(prevBtn, content, nextBtn);

  dialog.append(bar, stage, live);
  document.body.append(dialog);

  closeBtn.addEventListener('click', () => dialog.close());

  return {
    dialog,
    stage,
    content,
    image,
    doc,
    filePanel,
    fileExt,
    fileName,
    fileDownload,
    download,
    counter,
    live,
    prevBtn,
    nextBtn,
    fullscreenBtn,
  };
};

let viewer: Viewer | undefined;
let activeItems: ReadonlyArray<GalleryItem> = [];
let renderToken = 0;
let programmaticClose = false;
/*
 * True when THIS open pushed a history entry (tile click) — so closing
 * pops it. A deep-link open adds no entry, so closing just strips the
 * hash in place instead of navigating off the page.
 */
let pushedOpen = false;
const session: Session = { items: [], index: 0, invoker: undefined };

let renderersPromise: Promise<typeof import('./archive-renderers')> | undefined;
const loadRenderers = (): Promise<typeof import('./archive-renderers')> => {
  renderersPromise ??= import('./archive-renderers');
  return renderersPromise;
};

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

const showMode = (v: Viewer, mode: ViewerMode): void => {
  v.image.hidden = mode !== 'image';
  v.filePanel.hidden = mode !== 'other';
  v.doc.hidden = mode === 'image' || mode === 'other';
};

const applyImage = (v: Viewer, item: GalleryItem): void => {
  v.stage.classList.add('is-loading');
  v.image.src = item.full ?? item.download;
  v.image.alt = item.name;
};

const applyFile = (v: Viewer, item: GalleryItem): void => {
  v.stage.classList.remove('is-loading');
  v.image.removeAttribute('src');
  v.image.alt = '';
  v.fileExt.textContent = item.ext;
  v.fileName.textContent = item.name;
  v.fileDownload.href = item.download;
};

const applyDoc = (v: Viewer, item: GalleryItem, kind: DocKind): void => {
  const token = ++renderToken;
  v.image.removeAttribute('src');
  v.doc.replaceChildren();
  v.stage.classList.add('is-loading');
  loadRenderers()
    .then((mod) =>
      token === renderToken ? mod.renderDoc(kind, item.download, item.name, v.doc) : undefined,
    )
    .then(() => {
      if (token === renderToken) v.stage.classList.remove('is-loading');
    })
    .catch(() => {
      if (token !== renderToken) return;
      v.stage.classList.remove('is-loading');
      showMode(v, 'other');
      applyFile(v, item);
    });
};

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
  v.download.href = item.download;
  const mode = viewerMode(item);
  showMode(v, mode);
  if (mode === 'image') applyImage(v, item);
  else if (mode === 'other') applyFile(v, item);
  else applyDoc(v, item, mode);
};

const go = (delta: number): void => {
  const next = session.index + delta;
  if (next < 0 || next >= session.items.length) return;
  session.index = next;
  if (viewer) render(viewer);
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
 * replays on every step. Scoped to the pane — no top-layer View
 * Transition, which janks inside a modal <dialog>.
 */
const animatePane = (v: Viewer, dir: number): void => {
  if (prefersReducedMotion()) return;
  const cls = dir > 0 ? 'archive-anim-next' : 'archive-anim-prev';
  v.content.classList.remove('archive-anim-next', 'archive-anim-prev');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => v.content.classList.add(cls));
  });
};

/*
 * Move to a neighbouring item, mirror it into the URL hash, and animate
 * the pane in the travel direction.
 */
const navigate = (delta: number): void => {
  if (!canGo(delta)) return;
  const target = session.items[session.index + delta]?.name;
  go(delta);
  if (target !== undefined) setHash(target, false);
  animatePane(getViewer(), delta);
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
 * A horizontal flick past the threshold navigates; the visual is the
 * shared View Transition, not a finger-tracking drag.
 */
const wireSwipe = (v: Viewer): void => {
  let startX: number | undefined;
  v.content.addEventListener('pointerdown', (e: PointerEvent) => {
    startX = e.clientX;
  });
  v.content.addEventListener('pointercancel', () => {
    startX = undefined;
  });
  v.content.addEventListener('pointerup', (e: PointerEvent) => {
    if (startX === undefined) return;
    const dx = e.clientX - startX;
    startX = undefined;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    navigate(dx < 0 ? 1 : -1);
  });
};

const open = (items: ReadonlyArray<GalleryItem>, index: number, fromUrl: boolean): void => {
  const v = getViewer();
  session.items = items;
  session.index = index;
  session.invoker = items[index]?.trigger;
  render(v);
  if (!v.dialog.open) v.dialog.showModal();
  const name = items[index]?.name;
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
    const index = activeItems.findIndex((item) => item.name === name);
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

const collectItems = (gallery: HTMLElement): ReadonlyArray<GalleryItem> =>
  [...gallery.querySelectorAll<HTMLButtonElement>('[data-archive-item]')].flatMap((trigger) => {
    const download = trigger.getAttribute('data-download');
    if (!download) return [];
    const kind = trigger.getAttribute('data-kind') === 'file' ? 'file' : 'image';
    return [
      {
        kind,
        name: trigger.getAttribute('data-name') ?? '',
        download,
        ext: trigger.getAttribute('data-ext') ?? '',
        full: trigger.getAttribute('data-full') ?? undefined,
        trigger,
      } as const,
    ];
  });

const wireViewerOnce = (v: Viewer): void => {
  v.prevBtn.addEventListener('click', () => navigate(-1));
  v.nextBtn.addEventListener('click', () => navigate(1));
  v.fullscreenBtn.addEventListener('click', () => toggleFullscreen(v));
  v.image.addEventListener('load', () => v.stage.classList.remove('is-loading'));
  v.image.addEventListener('error', () => v.stage.classList.remove('is-loading'));
  v.content.addEventListener('animationend', () => {
    v.content.classList.remove('archive-anim-next', 'archive-anim-prev');
  });
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
export const initArchiveLightbox = (): void => {
  const galleries = document.querySelectorAll<HTMLElement>('[data-archive-gallery]');
  if (galleries.length === 0) return;

  /*
   * Prefetch the renderer chunk as soon as an archive page loads, so it
   * is usually ready by the time a document is opened (the spinner
   * covers a fast click that beats the download).
   */
  loadRenderers().catch(() => undefined);

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
    const index = activeItems.findIndex((item) => item.name === initial);
    if (index >= 0) open(activeItems, index, true);
  }
};
