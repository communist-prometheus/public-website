import { describe, expect, it } from 'vitest';
import { pickPlacement, type RectLike, type Viewport } from './pick-placement';

const rect = (top: number, left: number, width: number, height: number): RectLike => ({
  top,
  left,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

const viewport = (width: number, height: number): Viewport => ({ width, height });

describe('pickPlacement — vertical axis', () => {
  it('opens down when there is enough room below the trigger', () => {
    const trigger = rect(40, 100, 60, 32);
    const dropdown = rect(0, 0, 140, 200);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p.vertical).toBe('down');
  });

  it('flips up when below would overflow the viewport', () => {
    // Trigger near the bottom edge — dropdown 200px tall does not fit.
    const trigger = rect(550, 100, 60, 32);
    const dropdown = rect(0, 0, 140, 200);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p.vertical).toBe('up');
  });

  it('falls back to the side with more space when neither fits', () => {
    /*
     * Tiny viewport — dropdown taller than the available space on
     * either side. Trigger sits 80% down the viewport, so above wins.
     */
    const trigger = rect(200, 100, 60, 32);
    const dropdown = rect(0, 0, 140, 500);
    const p = pickPlacement(trigger, dropdown, viewport(800, 250));
    expect(p.vertical).toBe('up');
  });

  it('prefers down when below has more space and neither fits', () => {
    const trigger = rect(20, 100, 60, 32);
    const dropdown = rect(0, 0, 140, 500);
    const p = pickPlacement(trigger, dropdown, viewport(800, 250));
    expect(p.vertical).toBe('down');
  });
});

describe('pickPlacement — horizontal axis', () => {
  it('right-aligns when the dropdown fits to the left of the trigger right edge', () => {
    const trigger = rect(40, 600, 60, 32);
    const dropdown = rect(0, 0, 200, 100);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p.horizontal).toBe('right');
  });

  it('flips to left-aligned when right-alignment would overflow the left viewport edge', () => {
    /*
     * Trigger near the left edge — right-aligning a 200px dropdown
     * would put its left edge at -130, off-screen.
     */
    const trigger = rect(40, 70, 60, 32);
    const dropdown = rect(0, 0, 200, 100);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p.horizontal).toBe('left');
  });

  it('picks the side with more space when neither alignment fits', () => {
    /*
     * Pathological: dropdown wider than viewport. Trigger at 30% from
     * the left, so left-aligned reaches further than right-aligned.
     */
    const trigger = rect(40, 240, 60, 32);
    const dropdown = rect(0, 0, 900, 100);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p.horizontal).toBe('left');
  });
});

describe('pickPlacement — combined corners', () => {
  it('bottom-right corner trigger → up + right', () => {
    const trigger = rect(540, 720, 56, 32);
    const dropdown = rect(0, 0, 200, 220);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p).toEqual({ vertical: 'up', horizontal: 'right' });
  });

  it('top-left corner trigger → down + left', () => {
    const trigger = rect(16, 16, 56, 32);
    const dropdown = rect(0, 0, 200, 220);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p).toEqual({ vertical: 'down', horizontal: 'left' });
  });

  it('top-right corner trigger → down + right', () => {
    const trigger = rect(16, 720, 56, 32);
    const dropdown = rect(0, 0, 200, 220);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p).toEqual({ vertical: 'down', horizontal: 'right' });
  });

  it('bottom-left corner trigger → up + left', () => {
    const trigger = rect(540, 16, 56, 32);
    const dropdown = rect(0, 0, 200, 220);
    const p = pickPlacement(trigger, dropdown, viewport(800, 600));
    expect(p).toEqual({ vertical: 'up', horizontal: 'left' });
  });
});
