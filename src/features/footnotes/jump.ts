/*
 * Handle the "jump to the footnote section" link inside a popover.
 *
 * We want browser-back to return the reader to the marker. Without
 * intervention, clicking a link with `href="#user-content-fn-N"`
 * pushes a single history entry — back would scroll to the top of
 * the page, not to the marker. So we first push the marker hash
 * onto history, *then* navigate to the footnote hash. Stack:
 *
 *   …current page… ← back
 *   #user-content-fnref-N (marker)
 *   #user-content-fn-N (footnote section, where the user lands)
 *
 * One press of back now returns to the marker; another returns to
 * wherever the reader was before opening any footnote.
 */

interface JumpDeps {
  readonly markerId: string;
  readonly footnoteId: string;
  readonly popover: HTMLElement;
}

/**
 * Wire a click handler on the popover's jump link that pushes the
 * marker hash before navigating to the footnote, then closes the
 * popover. The Popover API closes on outside click anyway, but
 * explicit close keeps the timing predictable.
 *
 * @param link - The jump anchor inside the popover.
 * @param deps - Marker + footnote ids plus the owning popover.
 */
export const wireJump = (link: HTMLAnchorElement, deps: JumpDeps): void => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState(null, '', `#${deps.markerId}`);
    globalThis.location.hash = deps.footnoteId;
    deps.popover.hidePopover();
  });
};
