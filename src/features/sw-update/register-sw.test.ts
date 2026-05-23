import { describe, expect, it, vi } from 'vitest';
import { setupSwUpdate } from './register-sw';

interface Harness {
  readonly api: Parameters<typeof setupSwUpdate>[0];
  readonly effects: Parameters<typeof setupSwUpdate>[1];
  readonly fireControllerChange: () => void;
  readonly reload: ReturnType<typeof vi.fn>;
  readonly update: ReturnType<typeof vi.fn>;
}

const makeHarness = (hadController: boolean): Harness => {
  const reload = vi.fn();
  const update = vi.fn().mockResolvedValue(undefined);
  let listener: (() => void) | undefined;
  return {
    api: {
      hasController: () => hadController,
      register: () => Promise.resolve({ update }),
      onControllerChange: (h) => {
        listener = h;
      },
    },
    effects: { reload },
    fireControllerChange: () => listener?.(),
    reload,
    update,
  };
};

describe('setupSwUpdate', () => {
  it('forces a registration.update() on every page load', async () => {
    const h = makeHarness(false);
    setupSwUpdate(h.api, h.effects);
    /* register() is async — let microtasks flush. */
    await Promise.resolve();
    await Promise.resolve();
    expect(h.update).toHaveBeenCalledTimes(1);
  });

  it('does NOT reload on the first-time controller attach', () => {
    /*
     * On a brand-new visit controller is null until the just-registered
     * SW takes over. That first controllerchange is not a "new version";
     * reloading would be a needless flash.
     */
    const h = makeHarness(false);
    setupSwUpdate(h.api, h.effects);
    h.fireControllerChange();
    expect(h.reload).not.toHaveBeenCalled();
  });

  it('reloads once when an existing controller is replaced', () => {
    /*
     * On a returning visit `hasController()` is true at script start.
     * A controllerchange after that means a new SW just activated —
     * we want the page to immediately pick up the new HTML/JS.
     */
    const h = makeHarness(true);
    setupSwUpdate(h.api, h.effects);
    h.fireControllerChange();
    expect(h.reload).toHaveBeenCalledTimes(1);
  });

  it('coalesces repeated controllerchange events into a single reload', () => {
    /*
     * Some browsers fire `controllerchange` more than once during a
     * single rollover (e.g. install → activate). The `refreshing`
     * latch in the implementation guarantees we don't reload twice.
     */
    const h = makeHarness(true);
    setupSwUpdate(h.api, h.effects);
    h.fireControllerChange();
    h.fireControllerChange();
    h.fireControllerChange();
    expect(h.reload).toHaveBeenCalledTimes(1);
  });

  it('survives a failing update() without crashing the listener', async () => {
    /*
     * `registration.update()` can reject — for instance when the
     * browser can't reach /sw.js. The listener must keep wiring up
     * so the next page reload still has the controllerchange hook.
     */
    const h = makeHarness(true);
    const failing = {
      ...h.api,
      register: () => Promise.resolve({ update: () => Promise.reject(new Error('net')) }),
    };
    setupSwUpdate(failing, h.effects);
    await Promise.resolve();
    await Promise.resolve();
    h.fireControllerChange();
    expect(h.reload).toHaveBeenCalledTimes(1);
  });
});
