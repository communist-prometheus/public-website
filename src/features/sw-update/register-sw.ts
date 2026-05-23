/*
 * Service-worker registration with forced rollover on new deploys.
 *
 * Two guarantees this module provides on top of a plain
 * `navigator.serviceWorker.register('/sw.js')`:
 *
 *   1. `registration.update()` runs on every page load so a fresh
 *      `/sw.js` byte-check happens immediately. Without it the
 *      browser only polls once every 24h and a deploy can sit
 *      invisible for a day.
 *
 *   2. `controllerchange` triggers a one-shot `location.reload()`
 *      when an *existing* controller is replaced — meaning a new
 *      version of the SW just activated. The first-time install
 *      (controller was previously null) does NOT trigger a reload;
 *      it's not a "new version", it's the first version.
 *
 * The IO surface is injected so the logic is unit-testable without
 * the real `navigator.serviceWorker`.
 */

/** Minimal shape of the registration API we depend on. */
export interface SwApi {
  readonly hasController: () => boolean;
  readonly register: () => Promise<{
    /*
     * Real `ServiceWorkerRegistration.update()` resolves to the
     * registration; we don't use the value so `unknown` is enough
     * and lets the production binding pass the native API through
     * without an adapter.
     */
    readonly update: () => Promise<unknown>;
  }>;
  readonly onControllerChange: (handler: () => void) => void;
}

/** Side-effects the listener performs on a real version flip. */
export interface SwSideEffects {
  readonly reload: () => void;
}

/**
 * Wire the registration + controllerchange listener against any
 * injectable IO. Returns nothing; the side effects are observable
 * via the supplied `effects` (reload calls).
 *
 * @param api - SW API adapter (real `navigator.serviceWorker` in production, mock in tests).
 * @param effects - Side-effect adapter (real `location.reload` in production, spy in tests).
 */
export const setupSwUpdate = (api: SwApi, effects: SwSideEffects): void => {
  const hadController = api.hasController();
  api.register().then((reg) => {
    reg.update().catch(() => undefined);
  });
  let refreshing = false;
  api.onControllerChange(() => {
    if (!hadController || refreshing) return;
    refreshing = true;
    effects.reload();
  });
};
