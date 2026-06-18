/*
 * Framework-free progressive-enhancement lightbox for archive
 * galleries. No Vue/React/Astro-island — plain DOM. Each gallery is a
 * `[data-archive-gallery]` container whose `<button data-archive-item>`
 * tiles carry `data-kind` (image|file), `data-name`, `data-download`
 * and, for images, `data-full` (optimised large image URL). Clicking a
 * tile opens a single shared <dialog> overlay that navigates across the
 * whole gallery — images render full, any other file renders a
 * pictogram + filename + download (R2.5), so there is no image/file
 * divide and per-type previewers can be added later without changing
 * call sites.
 *
 * Accessibility: native `dialog.showModal()` provides the focus trap;
 * we restore focus to the invoking tile on close, announce the current
 * position via a polite live region, and wire ArrowLeft/Right + Escape.
 * Touch drag follows the finger and snaps/slides on release.
 */

const SWIPE_THRESHOLD = 60;
const TAP_SLOP = 6;

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
  content.append(image, filePanel);

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
const session: Session = { items: [], index: 0, invoker: undefined };

const getViewer = (): Viewer => {
  if (!viewer) viewer = buildViewer();
  return viewer;
};

const renderImage = (v: Viewer, item: GalleryItem): void => {
  v.filePanel.hidden = true;
  v.image.hidden = false;
  v.stage.classList.add('is-loading');
  v.image.src = item.full ?? item.download;
  v.image.alt = item.name;
};

const renderFile = (v: Viewer, item: GalleryItem): void => {
  v.stage.classList.remove('is-loading');
  v.image.hidden = true;
  v.image.removeAttribute('src');
  v.image.alt = '';
  v.filePanel.hidden = false;
  v.fileExt.textContent = item.ext;
  v.fileName.textContent = item.name;
  v.fileDownload.href = item.download;
};

const render = (v: Viewer): void => {
  const item = session.items[session.index];
  if (!item) return;
  const total = session.items.length;
  const position = session.index + 1;
  v.counter.textContent = `${position} / ${total}`;
  v.live.textContent = `File ${position} of ${total}`;
  v.prevBtn.disabled = session.index === 0;
  v.nextBtn.disabled = session.index === total - 1;
  v.download.href = item.download;
  if (item.kind === 'image') {
    renderImage(v, item);
  } else {
    renderFile(v, item);
  }
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
    go(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    go(1);
  } else if (event.key === 'Escape' && document.fullscreenElement) {
    /* Exit fullscreen first; a second Escape closes the dialog. */
    event.preventDefault();
    exitFullscreen();
  }
};

const setTransform = (v: Viewer, x: number, animate: boolean): void => {
  v.content.classList.toggle('is-animating', animate);
  v.content.style.transform = x === 0 ? '' : `translateX(${x}px)`;
};

/*
 * Slide the current item out, swap to the neighbour, then slide it in
 * from the opposite edge. Reduced-motion users get an instant swap.
 */
const commitSwipe = (v: Viewer, dir: number): void => {
  const width = v.content.clientWidth || globalThis.innerWidth || 1;
  if (prefersReducedMotion()) {
    go(dir);
    setTransform(v, 0, false);
    return;
  }
  setTransform(v, dir > 0 ? -width : width, true);
  v.content.addEventListener(
    'transitionend',
    () => {
      go(dir);
      setTransform(v, dir > 0 ? width : -width, false);
      requestAnimationFrame(() => setTransform(v, 0, true));
    },
    { once: true },
  );
};

const wireDrag = (v: Viewer): void => {
  let startX: number | undefined;
  let dx = 0;
  v.content.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX = e.clientX;
    dx = 0;
    v.content.classList.remove('is-animating');
  });
  v.content.addEventListener('pointermove', (e: PointerEvent) => {
    if (startX === undefined) return;
    dx = e.clientX - startX;
    /* Rubber-band at the ends so there is nothing to swipe past. */
    const resisted = canGo(dx < 0 ? 1 : -1) ? dx : dx * 0.3;
    setTransform(v, resisted, false);
  });
  const end = (): void => {
    if (startX === undefined) return;
    startX = undefined;
    const dir = dx < 0 ? 1 : -1;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && canGo(dir)) {
      commitSwipe(v, dir);
    } else if (Math.abs(dx) > TAP_SLOP) {
      setTransform(v, 0, true);
    }
  };
  v.content.addEventListener('pointerup', end);
  v.content.addEventListener('pointercancel', end);
};

const open = (items: ReadonlyArray<GalleryItem>, index: number): void => {
  const v = getViewer();
  session.items = items;
  session.index = index;
  session.invoker = items[index]?.trigger;
  setTransform(v, 0, false);
  render(v);
  v.dialog.showModal();
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
  v.prevBtn.addEventListener('click', () => go(-1));
  v.nextBtn.addEventListener('click', () => go(1));
  v.fullscreenBtn.addEventListener('click', () => toggleFullscreen(v));
  v.image.addEventListener('load', () => v.stage.classList.remove('is-loading'));
  v.image.addEventListener('error', () => v.stage.classList.remove('is-loading'));
  v.dialog.addEventListener('close', () => {
    exitFullscreen();
    session.invoker?.focus();
  });
  wireDrag(v);
  document.addEventListener('keydown', onKeydown);
};

/**
 * Initialise every archive gallery on the page. Idempotent: galleries
 * already wired (and the shared viewer) are skipped, so it is safe to
 * call on first load and after Astro view transitions.
 */
export const initArchiveLightbox = (): void => {
  const galleries = document.querySelectorAll<HTMLElement>('[data-archive-gallery]');
  if (galleries.length === 0) return;

  const v = getViewer();
  if (v.dialog.getAttribute('data-wired') !== 'true') {
    v.dialog.setAttribute('data-wired', 'true');
    wireViewerOnce(v);
  }

  galleries.forEach((gallery) => {
    if (gallery.getAttribute('data-archive-wired') === 'true') return;
    gallery.setAttribute('data-archive-wired', 'true');
    const items = collectItems(gallery);
    items.forEach((item, index) => {
      item.trigger.addEventListener('click', () => open(items, index));
    });
  });
};
