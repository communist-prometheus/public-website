/* biome-ignore-all lint/complexity/useLiteralKeys: tsconfig's noPropertyAccessFromIndexSignature requires bracket access on DOMStringMap. */
import '@web-file-reader/viewer';
import '@web-file-reader/navigation';
import '@web-file-reader/settings';
import type { FileDescriptor } from '@web-file-reader/core';
import { canGoNext, canGoPrev, createPaging } from '@web-file-reader/core';
import type { WfrViewerNav } from '@web-file-reader/navigation';
import type { WfrSettingsPanel } from '@web-file-reader/settings';
import type { WfrViewer } from '@web-file-reader/viewer';
import { fileIdFromLocation, withBase } from './base';
import { downloadFile } from './download';
import { fileById, getFiles, indexOfFile } from './files';
import { getRegistry } from './registry';
import { loadSettings, saveSettings } from './settings-store';

interface Shell {
  readonly dialog: HTMLDialogElement;
  readonly track: HTMLElement;
  readonly nav: WfrViewerNav;
  readonly panel: WfrSettingsPanel;
}

/*
 * The shell is created once and never removed/reinserted. The content area is a
 * three-pane horizontal scroll-snap carousel: a native swipe scrolls it, and the
 * slide that settles in the viewport becomes the current file. Slides are
 * recycled (ring) so paging never reloads an already-rendered, visible pane.
 */
let wired = false;
let currentId: string | undefined;
let currentProviderId: string | undefined;
/* suppress settle handling during programmatic recenters */
let settling = false;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let originalTitle: string | undefined;

const registry = getRegistry();

/*
 * Reference wfr-host encodes the current file in the pathname (`/viewer/<id>`);
 * we encode it in the location hash (`#asset=<id>`) so the archive album's own
 * page URL stays clean and we don't have to statically generate a viewer route
 * per file per album per locale.
 */
const fileIdFromCurrentLocation = (): string | undefined => fileIdFromLocation();

/** Safely read the opened file id from a `wfr-open` event (untyped detail). */
const openIdFromEvent = (event: Event): string | undefined => {
  if (!(event instanceof CustomEvent)) return undefined;
  const detail: unknown = event.detail;
  if (!detail || typeof detail !== 'object' || !('file' in detail)) return undefined;
  const file: unknown = detail.file;
  if (!file || typeof file !== 'object' || !('id' in file)) return undefined;
  const id: unknown = file.id;
  return typeof id === 'string' ? id : undefined;
};

const prefersReducedMotion = (): boolean =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const shell = (): Shell | undefined => {
  const dialog = document.querySelector('dialog');
  const track = document.getElementById('track');
  const nav = document.querySelector<WfrViewerNav>('wfr-viewer-nav');
  const panel = document.querySelector<WfrSettingsPanel>('wfr-settings-panel');
  if (!dialog || !track || !nav || !panel) return undefined;
  return { dialog, track, nav, panel };
};

const sections = (s: Shell): readonly HTMLElement[] =>
  Array.from(s.track.children).filter((c): c is HTMLElement => c instanceof HTMLElement);

const viewerIn = (section: HTMLElement): WfrViewer | undefined =>
  section.querySelector<WfrViewer>('wfr-viewer') ?? undefined;

const currentViewer = (s: Shell): WfrViewer | undefined => {
  const section = sections(s).find((sec) => sec.dataset['fileId'] === currentId);
  return section === undefined ? undefined : viewerIn(section);
};

/** Fill a slide's viewer with `file` (or empty + hide it when there is none). */
const fillSlide = (section: HTMLElement, file: FileDescriptor | undefined): void => {
  const viewer = viewerIn(section);
  if (viewer === undefined) return;
  if (file === undefined) {
    section.hidden = true;
    section.dataset['fileId'] = '';
    viewer.file = undefined;
    return;
  }
  section.hidden = false;
  section.dataset['fileId'] = file.id;
  viewer.registry = registry;
  const provider = registry.resolve(file);
  /*
   * Resolve persisted settings before the file so Lit renders once. Awaited
   * lazily — neighbours render with defaults until then, which is invisible.
   */
  if (provider !== undefined) {
    registry
      .load(file)
      .then((mod) => {
        if (mod !== undefined && section.dataset['fileId'] === file.id) {
          viewer.settings = loadSettings(provider.id, mod.settingsSchema);
        }
      })
      .catch(() => undefined);
  }
  viewer.file = file;
};

/** Mark which slide is the current file (drives selectors + settings target). */
const markCurrent = (s: Shell, section: HTMLElement): void => {
  for (const sec of sections(s)) {
    if (sec === section) sec.setAttribute('aria-current', 'true');
    else sec.removeAttribute('aria-current');
  }
};

/**
 * Centre the track on `section` instantly. Snap is disabled for the jump so
 * mandatory scroll-snap can't fight the reposition (which caused a jerk).
 */
const centre = (s: Shell, section: HTMLElement): void => {
  settling = true;
  const { track } = s;
  const prevSnap = track.style.scrollSnapType;
  track.style.scrollSnapType = 'none';
  track.scrollLeft = section.offsetLeft;
  track.style.scrollSnapType = prevSnap;
  requestAnimationFrame(() => {
    settling = false;
  });
};

/** Lay out prev/current/next around `file` and centre it (used on open/sync). */
const layout = (s: Shell, file: FileDescriptor): void => {
  const [a, b, c] = sections(s);
  if (a === undefined || b === undefined || c === undefined) return;
  const idx = indexOfFile(file.id);
  const files = getFiles();
  fillSlide(a, files[idx - 1]);
  fillSlide(b, file);
  fillSlide(c, files[idx + 1]);
  markCurrent(s, b);
  centre(s, b);
};

/** Recycle slides so the committed file is centred without reloading visible panes. */
const recentre = (s: Shell, file: FileDescriptor): void => {
  const list = sections(s);
  const [a, , c] = list;
  const committed = list.find((sec) => sec.dataset['fileId'] === file.id);
  const idx = indexOfFile(file.id);
  if (committed === undefined || a === undefined || c === undefined) {
    layout(s, file);
    return;
  }
  const files = getFiles();
  if (committed === c) {
    /* leftmost becomes the new far-right */
    s.track.append(a);
    fillSlide(a, files[idx + 1]);
  } else if (committed === a) {
    /* rightmost becomes the new far-left */
    s.track.prepend(c);
    fillSlide(c, files[idx - 1]);
  } else {
    layout(s, file);
    return;
  }
  markCurrent(s, committed);
  centre(s, committed);
};

/** Update URL/title/aria/controls for the new current file. */
const setCurrent = (s: Shell, file: FileDescriptor, push: boolean): void => {
  currentId = file.id;
  if (push) history.pushState({ wfr: file.id }, '', withBase(`viewer/${file.id}`));
  document.getElementById('viewer-title')?.replaceChildren(file.name);
  s.dialog.setAttribute('aria-label', `Viewing ${file.name}`);
  /* Preserve the archive page's title so closing the viewer restores it. */
  if (originalTitle === undefined) originalTitle = document.title;
  document.title = `${file.name} — ${originalTitle}`;
  const paging = createPaging(indexOfFile(file.id), getFiles().length);
  s.nav.canPrev = canGoPrev(paging);
  s.nav.canNext = canGoNext(paging);
  applyPanel(s, file).catch(() => undefined);
  s.panel.setAttribute('hidden', '');
  document.getElementById('settings-button')?.setAttribute('aria-expanded', 'false');
};

/** Load the current provider's schema + settings into the settings panel. */
const applyPanel = async (s: Shell, file: FileDescriptor): Promise<void> => {
  const provider = registry.resolve(file);
  currentProviderId = provider?.id;
  if (provider === undefined) return;
  const mod = await registry.load(file);
  if (mod === undefined || file.id !== currentId) return;
  s.panel.schema = mod.settingsSchema;
  s.panel.settings = loadSettings(provider.id, mod.settingsSchema);
};

/** Commit `file` as current and recycle the carousel around it. */
const commit = (s: Shell, file: FileDescriptor, push: boolean): void => {
  if (file.id === currentId) return;
  setCurrent(s, file, push);
  recentre(s, file);
};

/*
 * Paging animations use a fixed duration (no speed control on native smooth
 * scroll); ~2x faster than the browser default.
 */
const PAGE_SCROLL_MS = 180;
/* px — treat as "on a snap point" within this */
const SNAP_TOLERANCE = 2;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

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
const nearestSnapSection = (s: Shell): HTMLElement | undefined => {
  let best: HTMLElement | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const sec of sections(s)) {
    if (sec.hidden) continue;
    const dist = Math.abs(sec.offsetLeft - s.track.scrollLeft);
    if (dist < bestDist) {
      bestDist = dist;
      best = sec;
    }
  }
  return best;
};

/**
 * Once scrolling stops, align to the nearest snap point and commit + recentre.
 *
 * No JS glide here: on a real device mandatory snap has already settled exactly
 * on a snap point by the time we run, so the align is a no-op and the recentre
 * is geometrically neutral. A glide would FIGHT a fast follow-up swipe's native
 * scroll. The `finally` is essential: it guarantees the `settling` guard is
 * released even if commit throws — otherwise every future settle is blocked and
 * the title/aria desync from the centred slide (which then sits stuck off-snap).
 */
const onSettle = (s: Shell): void => {
  if (settling) return;
  const target = nearestSnapSection(s);
  if (target === undefined) return;
  const file = fileById(target.dataset['fileId']);
  if (file === undefined) return;
  const onSnap = Math.abs(s.track.scrollLeft - target.offsetLeft) <= SNAP_TOLERANCE;
  /* already settled on the current slide */
  if (file.id === currentId && onSnap) return;
  settling = true;
  try {
    s.track.style.scrollSnapType = 'none';
    /* align (a no-op once natively snapped) */
    s.track.scrollLeft = target.offsetLeft;
    if (file.id !== currentId) commit(s, file, true);
  } finally {
    s.track.style.scrollSnapType = '';
    requestAnimationFrame(() => {
      settling = false;
    });
  }
};

/*
 * Commit after the scroll settles. `scrollend` fires once snap finishes; the
 * debounce is a fallback for browsers without it.
 */
const onScroll = (s: Shell): void => {
  if (settling) return;
  if (settleTimer !== undefined) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => onSettle(s), 140);
};

/** Page via controls/keyboard: scroll to the neighbour slide (snappy), then commit. */
const page = (s: Shell, delta: number): void => {
  const [a, , c] = sections(s);
  const target = delta < 0 ? a : c;
  if (target === undefined || target.hidden) return;
  const file = fileById(target.dataset['fileId']);
  if (file === undefined) return;
  /* suppress mid-animation settle commits */
  settling = true;
  /*
   * Mandatory scroll-snap fights a JS scrollLeft animation (it yanks each frame
   * back to a snap point — the "bounce"). Disable snap for the animation, then
   * restore it once we've landed/recentred on a snap point.
   */
  s.track.style.scrollSnapType = 'none';
  const ms = prefersReducedMotion() ? 0 : PAGE_SCROLL_MS;
  animateScrollLeft(s.track, target.offsetLeft, ms, easeOutCubic, () => {
    try {
      commit(s, file, true);
    } finally {
      s.track.style.scrollSnapType = '';
      settling = false;
    }
  });
};

/** Open the dialog (once) and show `file`. */
const open = (s: Shell, id: string, push: boolean): void => {
  const file = fileById(id);
  if (file === undefined) return;
  /*
   * Show first: slide offsets are only measurable once the dialog is displayed,
   * so centring a mid-list file must happen after showModal.
   */
  if (!s.dialog.open) {
    s.dialog.showModal();
    /*
     * Focus the track (not the dialog) so `<wfr-viewer-nav>`'s keydown
     * listener — bound to `nav.target = track` — sees ArrowLeft/ArrowRight.
     * With focus on the dialog the keydown fires on the dialog itself and
     * never reaches the track's handler chain.
     */
    s.track.focus();
  }
  setCurrent(s, file, push);
  layout(s, file);
};

const close = (s: Shell, push: boolean): void => {
  if (push) history.pushState({}, '', withBase(''));
  if (originalTitle !== undefined) document.title = originalTitle;
  if (s.dialog.open) s.dialog.close();
};

const syncToLocation = (s: Shell): void => {
  const id = fileIdFromCurrentLocation();
  const file = id === undefined ? undefined : fileById(id);
  if (file === undefined) {
    close(s, false);
    return;
  }
  open(s, file.id, false);
};

const wireOnce = (s: Shell): void => {
  if (wired) return;
  wired = true;
  const { dialog, track, nav, panel } = s;

  /*
   * The carousel owns horizontal paging; the nav keeps tap-to-toggle, the
   * prev/next buttons and keyboard arrows.
   */
  nav.target = track;
  nav.swipe = false;
  nav.addEventListener('wfr-prev', () => page(s, -1));
  nav.addEventListener('wfr-next', () => page(s, 1));

  track.addEventListener('scroll', () => onScroll(s), { passive: true });
  track.addEventListener('scrollend', () => onSettle(s), { passive: true });

  document.addEventListener('wfr-open', (event) => {
    const id = openIdFromEvent(event);
    if (id !== undefined) open(s, id, true);
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close(s, true);
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close(s, true);
  });

  document.getElementById('close-button')?.addEventListener('click', (event) => {
    event.preventDefault();
    close(s, true);
  });

  document.getElementById('fs-button')?.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else if (typeof dialog.requestFullscreen === 'function') {
      dialog.requestFullscreen().catch(() => undefined);
    }
  });

  document.getElementById('download-button')?.addEventListener('click', () => {
    const file = fileById(currentId);
    if (file !== undefined) downloadFile(file).catch(() => undefined);
  });

  const settingsButton = document.getElementById('settings-button');
  settingsButton?.addEventListener('click', () => {
    const willShow = panel.hasAttribute('hidden');
    panel.toggleAttribute('hidden');
    settingsButton.setAttribute('aria-expanded', String(willShow));
  });

  panel.addEventListener('wfr-settings-change', (event) => {
    if (event instanceof CustomEvent) {
      if (currentProviderId !== undefined) saveSettings(currentProviderId, event.detail.settings);
      const viewer = currentViewer(s);
      if (viewer !== undefined) viewer.settings = event.detail.settings;
    }
  });

  globalThis.addEventListener('popstate', () => syncToLocation(s));
  /*
   * Grid.astro calls setFiles() when it mounts, which dispatches this event.
   * If a deep-link `#asset=<id>` was in the URL BEFORE setFiles ran, our
   * initial sync exited with no files — this event triggers a re-sync now
   * that the list is populated.
   */
  document.addEventListener('archive-files-ready', () => syncToLocation(s));
  /* Re-centre the active slide if the viewport resizes (rotation, address bar). */
  globalThis.addEventListener('resize', () => {
    const section = sections(s).find((sec) => sec.dataset['fileId'] === currentId);
    if (section !== undefined) centre(s, section);
  });
};

/** Wire (once) and sync the persistent carousel shell to the current URL. */
export const setupViewer = (): void => {
  const current = shell();
  if (current === undefined) return;
  wireOnce(current);
  syncToLocation(current);
  /*
   * Reveal the landing now the viewer is opened/synced — on a /viewer/ deep
   * link this avoids a flash of the file grid before the dialog appears.
   */
  document.documentElement.removeAttribute('data-wfr-boot');
};
