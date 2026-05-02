/*
 * Pure helper that picks dropdown placement relative to a trigger
 * given the viewport box. The component renders the dropdown
 * hidden, measures its intrinsic size, then calls this function to
 * decide which side of the trigger to anchor to.
 *
 * Decision rules:
 * - vertical: prefer below the trigger when there is enough room.
 *   When neither side has enough room, pick the one with more space
 *   so we degrade gracefully on tiny viewports.
 * - horizontal: prefer right-edge alignment with the trigger
 *   (matches the "menu opens from the trigger corner" mental model).
 *   Flip to left-aligned when right-aligning would overflow the
 *   left edge of the viewport.
 */

/** Subset of DOMRect we actually use — keeps the helper testable. */
export interface RectLike {
  readonly top: number;
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

/** Viewport width + height. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** Resolved placement direction along each axis. */
export interface Placement {
  readonly vertical: 'down' | 'up';
  readonly horizontal: 'left' | 'right';
}

/** Gap (px) between trigger and dropdown along the chosen axis. */
export const PLACEMENT_GAP = 4;

/**
 * Compute the placement for a dropdown.
 *
 * @param trigger The trigger button's bounding rect.
 * @param dropdown The dropdown's intrinsic bounding rect.
 * @param viewport Current viewport size.
 * @returns Direction to open along each axis.
 */
export const pickPlacement = (
  trigger: RectLike,
  dropdown: RectLike,
  viewport: Viewport,
): Placement => ({
  vertical: pickVertical(trigger, dropdown, viewport),
  horizontal: pickHorizontal(trigger, dropdown, viewport),
});

const pickVertical = (
  trigger: RectLike,
  dropdown: RectLike,
  viewport: Viewport,
): Placement['vertical'] => {
  const spaceBelow = viewport.height - trigger.bottom;
  const spaceAbove = trigger.top;
  const needed = dropdown.height + PLACEMENT_GAP;
  if (spaceBelow >= needed) return 'down';
  if (spaceAbove >= needed) return 'up';
  return spaceBelow >= spaceAbove ? 'down' : 'up';
};

const pickHorizontal = (
  trigger: RectLike,
  dropdown: RectLike,
  viewport: Viewport,
): Placement['horizontal'] => {
  const rightAlignedLeftEdge = trigger.right - dropdown.width;
  if (rightAlignedLeftEdge >= 0) return 'right';
  const leftAlignedRightEdge = trigger.left + dropdown.width;
  if (leftAlignedRightEdge <= viewport.width) return 'left';
  return rightAlignedLeftEdge >= viewport.width - leftAlignedRightEdge ? 'right' : 'left';
};
