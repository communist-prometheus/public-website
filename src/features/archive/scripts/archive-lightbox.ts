/*
 * Framework-free progressive-enhancement lightbox for archive
 * galleries. No Vue/React/Astro-island — plain DOM. Each gallery is a
 * `[data-archive-gallery]` container whose `<button data-archive-item>`
 * thumbnails carry `data-full` (large image URL) and `data-name`
 * (filename). Clicking one opens a single shared <dialog> overlay that
 * navigates across that gallery's images only. The gallery holds image
 * entries only; non-image files are separate download links.
 *
 * Accessibility: native `dialog.showModal()` provides the focus trap;
 * we restore focus to the invoking thumbnail on close, announce the
 * current position via a polite live region, and wire ArrowLeft/Right
 * + Escape. Touch swipe (pointer delta) mirrors prev/next.
 */

const SWIPE_THRESHOLD = 50;

interface GalleryItem {
  readonly full: string;
  readonly name: string;
  readonly trigger: HTMLButtonElement;
}

interface Viewer {
  readonly dialog: HTMLDialogElement;
  readonly image: HTMLImageElement;
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

const makeButton = (className: string, label: string, glyph: string): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `<span aria-hidden="true">${glyph}</span>`;
  return btn;
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

  const closeBtn = makeButton('archive-viewer-close', 'Close viewer', '✕');
  const prevBtn = makeButton('archive-viewer-prev', 'Previous file', '‹');
  const nextBtn = makeButton('archive-viewer-next', 'Next file', '›');
  const fullscreenBtn = makeButton('archive-viewer-fullscreen', 'Toggle fullscreen', '⛶');

  const bar = document.createElement('div');
  bar.className = 'archive-viewer-bar';
  bar.append(counter, fullscreenBtn, closeBtn);

  const stage = document.createElement('figure');
  stage.className = 'archive-viewer-stage';
  stage.append(prevBtn, image, nextBtn);

  dialog.append(bar, stage, live);
  document.body.append(dialog);

  closeBtn.addEventListener('click', () => dialog.close());

  return { dialog, image, counter, live, prevBtn, nextBtn, fullscreenBtn };
};

let viewer: Viewer | undefined;
const session: Session = { items: [], index: 0, invoker: undefined };

const getViewer = (): Viewer => {
  if (!viewer) viewer = buildViewer();
  return viewer;
};

const render = (v: Viewer): void => {
  const item = session.items[session.index];
  if (!item) return;
  const total = session.items.length;
  const position = session.index + 1;
  v.image.src = item.full;
  v.image.alt = item.name;
  v.counter.textContent = `${position} / ${total}`;
  v.live.textContent = `File ${position} of ${total}`;
  v.prevBtn.disabled = session.index === 0;
  v.nextBtn.disabled = session.index === total - 1;
};

const go = (delta: number): void => {
  const next = session.index + delta;
  if (next < 0 || next >= session.items.length) return;
  session.index = next;
  if (viewer) render(viewer);
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

const wireTouch = (v: Viewer): void => {
  let startX: number | undefined;
  v.image.addEventListener('pointerdown', (e: PointerEvent) => {
    startX = e.clientX;
  });
  v.image.addEventListener('pointerup', (e: PointerEvent) => {
    if (startX === undefined) return;
    const deltaX = e.clientX - startX;
    startX = undefined;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    go(deltaX < 0 ? 1 : -1);
  });
};

const open = (items: ReadonlyArray<GalleryItem>, index: number): void => {
  const v = getViewer();
  session.items = items;
  session.index = index;
  session.invoker = items[index]?.trigger;
  render(v);
  v.dialog.showModal();
};

const collectItems = (gallery: HTMLElement): ReadonlyArray<GalleryItem> =>
  [...gallery.querySelectorAll<HTMLButtonElement>('[data-archive-item]')].flatMap((trigger) => {
    const full = trigger.getAttribute('data-full');
    const name = trigger.getAttribute('data-name') ?? '';
    return full ? [{ full, name, trigger }] : [];
  });

const wireViewerOnce = (v: Viewer): void => {
  v.prevBtn.addEventListener('click', () => go(-1));
  v.nextBtn.addEventListener('click', () => go(1));
  v.fullscreenBtn.addEventListener('click', () => toggleFullscreen(v));
  v.dialog.addEventListener('close', () => {
    exitFullscreen();
    session.invoker?.focus();
  });
  wireTouch(v);
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
