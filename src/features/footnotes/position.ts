/*
 * Anchor the popover near its trigger button. The browser's
 * Popover API places popovers in the top layer at viewport (0,0)
 * by default; we override with `position: fixed` + JS-computed
 * top/left so the popover floats next to the marker.
 */

const MARGIN = 8;
const MAX_WIDTH = 360;

interface Box {
  readonly top: number;
  readonly left: number;
  readonly width: number;
}

const horizontal = (anchor: DOMRect, width: number): number => {
  const want = anchor.left + anchor.width / 2 - width / 2;
  const max = globalThis.innerWidth - width - MARGIN;
  return Math.max(MARGIN, Math.min(want, max));
};

const vertical = (anchor: DOMRect, height: number): number => {
  const below = anchor.bottom + MARGIN;
  const above = anchor.top - height - MARGIN;
  const fitsBelow = below + height <= globalThis.innerHeight - MARGIN;
  return fitsBelow || above < MARGIN ? below : above;
};

/**
 * Compute viewport-fixed top/left for the popover so it sits next
 * to the trigger button, clamped to the viewport with a small
 * margin. Tries below the trigger first; falls back to above when
 * the popover would overflow the viewport.
 *
 * @param trigger - The button that opened the popover.
 * @param popover - The popover element (already shown).
 * @returns The position the popover should be moved to.
 */
export const positionPopover = (trigger: HTMLElement, popover: HTMLElement): Box => {
  const a = trigger.getBoundingClientRect();
  const width = Math.min(MAX_WIDTH, globalThis.innerWidth - MARGIN * 2);
  popover.style.maxWidth = `${width}px`;
  const r = popover.getBoundingClientRect();
  return { top: vertical(a, r.height), left: horizontal(a, width), width };
};
