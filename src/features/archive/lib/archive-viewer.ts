/*
 * Archive lightbox powered by web-file-reader.
 *
 * SSR emits the tiles (SEO / no-JS friendly), each tile carries its
 * FileDescriptor serialised on `data-wfr-file`. This module wires:
 *   - clicks on `[data-archive-item]` → open the shared viewer
 *   - a 3-pane scroll-snap carousel: swiping the finger scrolls the track
 *     natively (real inertia); the slide that settles in the viewport
 *     becomes the current file, and slides are ring-recycled so paging
 *     never reloads an already-rendered, visible pane
 *   - prev / next / close / download UI
 *   - deep-link via `#asset=<name>` (Back button closes)
 *
 * The viewer itself is `<wfr-viewer>` from @web-file-reader/viewer, fed a
 * `FileDescriptor` and a provider registry; the heavy per-type renderers
 * are downloaded lazily by the registry on first use of each provider.
 *
 * Adapted from @web-file-reader/host-astro's setup-viewer.ts — the file-id
 * routing there becomes hash-based `#asset=<name>` here, and the ordered
 * file list is per-open (from the clicked gallery) instead of a static
 * FILES module.
 */

import '@web-file-reader/viewer';
import type { FileDescriptor } from '@web-file-reader/core';
import type { WfrViewer } from '@web-file-reader/viewer';
import { getRegistry } from '@/features/archive/lib/registry';

const HASH_KEY = 'asset';
/* Paging animation duration; ~2x faster than the browser default smooth. */
const PAGE_SCROLL_MS = 180;
/* Treat `scrollLeft` within this many px of a snap-point offset as "on it". */
const SNAP_TOLERANCE = 2;
/* Fallback debounce for browsers that don't fire `scrollend`. */
const SETTLE_DEBOUNCE_MS = 140;
/* Idle time in ms before the chrome (bar + arrows) auto-hides. */
const CHROME_IDLE_MS = 2500;

interface ArchiveItem {
  readonly file: FileDescriptor;
  readonly trigger: HTMLButtonElement;
}

interface Viewer {
  readonly dialog: HTMLDialogElement;
  readonly stage: HTMLElement;
  readonly track: HTMLElement;
  readonly counter: HTMLElement;
  readonly live: HTMLElement;
  readonly download: HTMLAnchorElement;
  readonly prevBtn: HTMLButtonElement;
  readonly nextBtn: HTMLButtonElement;
  readonly fullscreenBtn: HTMLButtonElement;
}

interface Session {
  items: ReadonlyArray<ArchiveItem>;
  invoker: HTMLButtonElement | undefined;
}

const registry = getRegistry();

const prefersReducedMotion = (): boolean =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const fullscreenSupported = (): boolean =>
  document.fullscreenEnabled === true && typeof Element.prototype.requestFullscreen === 'function';

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

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
  bar.append(counter, download, ...(fullscreenSupported() ? [fullscreenBtn] : []), closeBtn);

  const track = document.createElement('div');
  track.className = 'archive-viewer-track';
  track.setAttribute('role', 'group');
  track.setAttribute('aria-label', 'Files');
  /*
   * Three <wfr-viewer> panes at all times: prev / current / next. The
   * viewport becomes the current file's slide; a native swipe scrolls
   * the track, and the settled slide becomes current on `scrollend`.
   * Panes are recycled (ring) so paging never re-renders visible content.
   */
  for (let i = 0; i < 3; i++) {
    const slide = document.createElement('section');
    slide.className = 'archive-viewer-slide';
    slide.append(document.createElement('wfr-viewer'));
    track.append(slide);
  }

  const stage = document.createElement('figure');
  stage.className = 'archive-viewer-stage';
  stage.append(prevBtn, track, nextBtn);

  dialog.append(bar, stage, live);
  document.body.append(dialog);

  closeBtn.addEventListener('click', () => dialog.close());

  return {
    dialog,
    stage,
    track,
    counter,
    live,
    download,
    prevBtn,
    nextBtn,
    fullscreenBtn,
  };
};

let viewer: Viewer | undefined;
let activeItems: ReadonlyArray<ArchiveItem> = [];
let currentName: string | undefined;
let settling = false;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let programmaticClose = false;
/*
 * True when THIS open pushed a history entry (tile click) — so closing
 * pops it. A deep-link open adds no entry, so closing just strips the
 * hash in place instead of navigating off the page.
 */
let pushedOpen = false;
const session: Session = { items: [], invoker: undefined };

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

const itemByName = (name: string | undefined): ArchiveItem | undefined =>
  name === undefined ? undefined : session.items.find((it) => it.file.name === name);

const indexOfName = (name: string | undefined): number =>
  name === undefined ? -1 : session.items.findIndex((it) => it.file.name === name);

const sections = (v: Viewer): readonly HTMLElement[] =>
  Array.from(v.track.children).filter((c): c is HTMLElement => c instanceof HTMLElement);

const viewerIn = (section: HTMLElement): WfrViewer | undefined =>
  section.querySelector<WfrViewer>('wfr-viewer') ?? undefined;

/** Fill a slide's viewer with `item` (or empty + hide it when there is none). */
const fillSlide = (section: HTMLElement, item: ArchiveItem | undefined): void => {
  const el = viewerIn(section);
  if (el === undefined) return;
  if (item === undefined) {
    section.hidden = true;
    section.removeAttribute('data-name');
    el.file = undefined;
    return;
  }
  section.hidden = false;
  section.setAttribute('data-name', item.file.name);
  el.registry = registry;
  el.file = item.file;
};

/** Mark which slide is the current file (drives aria + focus target). */
const markCurrent = (v: Viewer, section: HTMLElement): void => {
  for (const sec of sections(v)) {
    if (sec === section) sec.setAttribute('aria-current', 'true');
    else sec.removeAttribute('aria-current');
  }
};

/*
 * Centre the track on `section` instantly. Snap is disabled for the jump so
 * mandatory scroll-snap can't fight the reposition (which caused a jerk).
 */
const centre = (v: Viewer, section: HTMLElement): void => {
  settling = true;
  const prevSnap = v.track.style.scrollSnapType;
  v.track.style.scrollSnapType = 'none';
  v.track.scrollLeft = section.offsetLeft;
  v.track.style.scrollSnapType = prevSnap;
  requestAnimationFrame(() => {
    settling = false;
  });
};

/** Lay out prev/current/next around `item` and centre it (used on open/sync). */
const layout = (v: Viewer, item: ArchiveItem): void => {
  const [a, b, c] = sections(v);
  if (a === undefined || b === undefined || c === undefined) return;
  const idx = indexOfName(item.file.name);
  fillSlide(a, session.items[idx - 1]);
  fillSlide(b, item);
  fillSlide(c, session.items[idx + 1]);
  markCurrent(v, b);
  centre(v, b);
};

/*
 * Recycle slides so the committed file is centred without reloading visible
 * panes. When the user has scrolled right past current, the leftmost slide
 * becomes the new far-right (and gets filled with the next-next file); same
 * mirror for the left direction.
 */
const recentre = (v: Viewer, item: ArchiveItem): void => {
  const list = sections(v);
  const [a, , c] = list;
  const committed = list.find((sec) => sec.getAttribute('data-name') === item.file.name);
  const idx = indexOfName(item.file.name);
  if (committed === undefined || a === undefined || c === undefined) {
    layout(v, item);
    return;
  }
  if (committed === c) {
    v.track.append(a);
    fillSlide(a, session.items[idx + 1]);
  } else if (committed === a) {
    v.track.prepend(c);
    fillSlide(c, session.items[idx - 1]);
  } else {
    layout(v, item);
    return;
  }
  markCurrent(v, committed);
  centre(v, committed);
};

/** Update URL/aria/counter/prev-next-disabled for the new current file. */
const setCurrent = (v: Viewer, item: ArchiveItem, push: boolean): void => {
  currentName = item.file.name;
  const total = session.items.length;
  const position = indexOfName(item.file.name) + 1;
  v.counter.textContent = `${position} / ${total}`;
  v.live.textContent = `File ${position} of ${total}`;
  v.dialog.setAttribute('aria-label', `Viewing ${item.file.name}`);
  /*
   * aria-disabled (not the `disabled` property) so the arrow stays in
   * the tab order and can be revealed on focus instead of vanishing.
   */
  v.prevBtn.setAttribute('aria-disabled', String(position <= 1));
  v.nextBtn.setAttribute('aria-disabled', String(position >= total));
  if (item.file.source.kind === 'url') {
    v.download.href = item.file.source.url;
  } else {
    v.download.removeAttribute('href');
  }
  if (push) setHash(item.file.name, false);
};

/** Commit `item` as current and recycle the carousel around it. */
const commit = (v: Viewer, item: ArchiveItem, push: boolean): void => {
  if (item.file.name === currentName) return;
  setCurrent(v, item, push);
  recentre(v, item);
};

/** Animate `el.scrollLeft` to `to` over `ms` with `ease`, then run `done`. */
const animateScrollLeft = (
  el: HTMLElement,
  to: number,
  ms: number,
  ease: (t: number) => number,
  done: () => void,
): void => {
  const from = el.scrollLeft;
  const distance = to - from;
  if (distance === 0 || ms <= 0) {
    el.scrollLeft = to;
    done();
    return;
  }
  let started: number | undefined;
  const step = (now: number): void => {
    started ??= now;
    const t = Math.min(1, (now - started) / ms);
    el.scrollLeft = from + distance * ease(t);
    if (t < 1) requestAnimationFrame(step);
    else done();
  };
  requestAnimationFrame(step);
};

/** The slide whose snap point (offsetLeft) is nearest the current scroll. */
const nearestSnapSection = (v: Viewer): HTMLElement | undefined => {
  let best: HTMLElement | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const sec of sections(v)) {
    if (sec.hidden) continue;
    const dist = Math.abs(sec.offsetLeft - v.track.scrollLeft);
    if (dist < bestDist) {
      bestDist = dist;
      best = sec;
    }
  }
  return best;
};

/*
 * Once scrolling stops, align to the nearest snap point and commit + recycle.
 * On a real device mandatory snap has already landed exactly on a snap point
 * by the time we run, so the align is a no-op. The `finally` guarantees the
 * `settling` guard is released even if commit throws — otherwise every
 * future settle is blocked and the counter/aria desync from the centred slide.
 */
const onSettle = (v: Viewer): void => {
  if (settling) return;
  const target = nearestSnapSection(v);
  if (target === undefined) return;
  const name = target.getAttribute('data-name') ?? undefined;
  const item = itemByName(name);
  if (item === undefined) return;
  const onSnap = Math.abs(v.track.scrollLeft - target.offsetLeft) <= SNAP_TOLERANCE;
  if (item.file.name === currentName && onSnap) return;
  settling = true;
  try {
    v.track.style.scrollSnapType = 'none';
    v.track.scrollLeft = target.offsetLeft;
    if (item.file.name !== currentName) commit(v, item, true);
  } finally {
    v.track.style.scrollSnapType = '';
    requestAnimationFrame(() => {
      settling = false;
    });
  }
};

const onScroll = (v: Viewer): void => {
  if (settling) return;
  if (settleTimer !== undefined) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => onSettle(v), SETTLE_DEBOUNCE_MS);
};

/*
 * Page via controls/keyboard: scroll to the neighbour slide (snappy), then
 * commit. Mandatory scroll-snap fights a JS scrollLeft animation (yanks each
 * frame back to a snap point — the "bounce"). Disable snap for the animation,
 * then restore it once we've landed on a snap point.
 */
const page = (v: Viewer, delta: number): void => {
  const [a, , c] = sections(v);
  const target = delta < 0 ? a : c;
  if (target === undefined || target.hidden) return;
  const name = target.getAttribute('data-name') ?? undefined;
  const item = itemByName(name);
  if (item === undefined) return;
  settling = true;
  v.track.style.scrollSnapType = 'none';
  const ms = prefersReducedMotion() ? 0 : PAGE_SCROLL_MS;
  animateScrollLeft(v.track, target.offsetLeft, ms, easeOutCubic, () => {
    try {
      commit(v, item, true);
    } finally {
      v.track.style.scrollSnapType = '';
      settling = false;
    }
  });
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

const exitFullscreen = (): void => {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => undefined);
  }
};

/*
 * Request fullscreen on the dialog first — a <dialog> in the top layer
 * upgrades cleanly to the fullscreen top layer in Chromium and Firefox.
 * If the browser rejects that (older WebKit was flaky here), fall back
 * to fullscreening the document element, which always works but leaves
 * the dialog stacking to the browser's top-layer default.
 */
const requestFullscreenWithFallback = async (v: Viewer): Promise<void> => {
  try {
    if (typeof v.dialog.requestFullscreen === 'function') {
      await v.dialog.requestFullscreen();
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    /* no fullscreen anywhere — nothing to do */
  }
};

const toggleFullscreen = (v: Viewer): void => {
  if (document.fullscreenElement) {
    exitFullscreen();
    return;
  }
  requestFullscreenWithFallback(v).catch(() => undefined);
};

/*
 * Chrome auto-hide. The bar + prev/next arrows fade out after ~2.5 s of no
 * user activity so the file itself is what the viewer viewer looks at. Any
 * pointer movement, keyboard press, or programmatic paging (setCurrent)
 * pokes the chrome back to visible and re-starts the idle timer. A tap on
 * an empty region of the stage toggles the chrome — same UX pattern as
 * Google Photos, Instagram, native image viewers.
 */
let chromeIdleTimer: ReturnType<typeof setTimeout> | undefined;

const setChromeHidden = (v: Viewer, hidden: boolean): void => {
  if (hidden) v.dialog.setAttribute('data-chrome-hidden', '');
  else v.dialog.removeAttribute('data-chrome-hidden');
};

const pokeChrome = (v: Viewer): void => {
  setChromeHidden(v, false);
  if (chromeIdleTimer !== undefined) clearTimeout(chromeIdleTimer);
  chromeIdleTimer = setTimeout(() => setChromeHidden(v, true), CHROME_IDLE_MS);
};

const toggleChrome = (v: Viewer): void => {
  const wasHidden = v.dialog.hasAttribute('data-chrome-hidden');
  setChromeHidden(v, !wasHidden);
  if (chromeIdleTimer !== undefined) {
    clearTimeout(chromeIdleTimer);
    chromeIdleTimer = undefined;
  }
  if (wasHidden) pokeChrome(v);
};

/*
 * True when the target of a click is a chrome control that should NOT
 * trigger the tap-toggle (else clicking Prev also hides Prev).
 */
const isChromeControl = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest('.archive-viewer-bar, .archive-viewer-prev, .archive-viewer-next, a, button') !==
    null;

const onKeydown = (event: KeyboardEvent): void => {
  const v = viewer;
  if (!v?.dialog.open) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    pokeChrome(v);
    page(v, -1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    pokeChrome(v);
    page(v, 1);
  } else if (event.key === 'Escape' && document.fullscreenElement) {
    /* Exit fullscreen first; a second Escape closes the dialog. */
    event.preventDefault();
    exitFullscreen();
  } else if (event.key === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    /* Keyboard shortcut for fullscreen — matches many native viewers. */
    event.preventDefault();
    pokeChrome(v);
    toggleFullscreen(v);
  }
};

const open = (items: ReadonlyArray<ArchiveItem>, index: number, fromUrl: boolean): void => {
  const v = getViewer();
  session.items = items;
  session.invoker = items[index]?.trigger;
  const item = items[index];
  if (item === undefined) return;
  /*
   * Show first: slide offsets are only measurable once the dialog is
   * displayed, so centring a mid-list file must happen after showModal.
   */
  if (!v.dialog.open) v.dialog.showModal();
  /*
   * Force setCurrent-then-layout even if currentName still matches the
   * previous session's file (a re-open of the same file from a different
   * gallery would otherwise skip layout in commit).
   */
  currentName = undefined;
  setCurrent(v, item, false);
  layout(v, item);
  /* Every open starts with the chrome visible + a fresh idle timer. */
  pokeChrome(v);
  const name = item.file.name;
  if (!fromUrl) {
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
    const index = activeItems.findIndex((it) => it.file.name === name);
    if (index < 0) return;
    if (!v.dialog.open) open(activeItems, index, true);
    else if (name !== currentName) {
      const item = activeItems[index];
      if (item !== undefined) {
        session.items = activeItems;
        setCurrent(v, item, false);
        layout(v, item);
      }
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
  v.prevBtn.addEventListener('click', () => {
    pokeChrome(v);
    page(v, -1);
  });
  v.nextBtn.addEventListener('click', () => {
    pokeChrome(v);
    page(v, 1);
  });
  v.fullscreenBtn.addEventListener('click', () => {
    pokeChrome(v);
    toggleFullscreen(v);
  });

  v.track.addEventListener('scroll', () => onScroll(v), { passive: true });
  v.track.addEventListener('scrollend', () => onSettle(v), { passive: true });

  v.dialog.addEventListener('close', () => {
    exitFullscreen();
    session.invoker?.focus();
    if (chromeIdleTimer !== undefined) {
      clearTimeout(chromeIdleTimer);
      chromeIdleTimer = undefined;
    }
    if (programmaticClose) return;
    if (pushedOpen) history.back();
    else clearHash();
  });

  document.addEventListener('keydown', onKeydown);
  window.addEventListener('popstate', onPopState);
  /*
   * Re-centre the active slide on viewport resize (rotation, address bar,
   * container-query changes) — slide offsets shift, so scroll needs to
   * follow the currently active slide.
   */
  window.addEventListener('resize', () => {
    const active = sections(v).find((sec) => sec.getAttribute('data-name') === currentName);
    if (active !== undefined) centre(v, active);
  });

  /*
   * Chrome activity tracking. Any pointer movement or key press pokes the
   * chrome back to visible and resets the 2.5 s idle timer; a click on an
   * empty region of the stage (i.e. NOT on a button/link) toggles it.
   * A finger swipe on the scroll-snap track scrolls the carousel and
   * suppresses the trailing click, so genuine swipes never toggle chrome.
   */
  v.dialog.addEventListener('pointermove', () => pokeChrome(v), { passive: true });
  v.dialog.addEventListener('focusin', () => pokeChrome(v), { passive: true });
  v.dialog.addEventListener('click', (event) => {
    if (isChromeControl(event.target)) return;
    toggleChrome(v);
  });

  /*
   * Reflect current fullscreen state on the button so screen readers announce
   * it and CSS can style the pressed variant if it wants to.
   */
  document.addEventListener('fullscreenchange', () => {
    const isFs = document.fullscreenElement !== null;
    v.fullscreenBtn.setAttribute('aria-pressed', String(isFs));
    v.fullscreenBtn.setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Toggle fullscreen');
  });
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
    const index = activeItems.findIndex((it) => it.file.name === initial);
    if (index >= 0) open(activeItems, index, true);
  }
};
