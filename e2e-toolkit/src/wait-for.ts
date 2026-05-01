import type { Page } from '@playwright/test';

/** Options for {@link waitForCondition}. */
export interface WaitOptions {
  /**
   * How long the condition must hold AND no new requests must fire
   * before we consider the page settled. 50 ms is plenty on a static
   * site; bump it to 200–500 ms when the page is genuinely dynamic.
   */
  readonly settleMs?: number;
  /**
   * Hard ceiling for the entire wait, used purely as a safety net.
   * Only an actual hang (the page kept firing requests forever) ever
   * trips it; healthy pages return in milliseconds.
   */
  readonly maxMs?: number;
  /**
   * Poll cadence. Lower means tighter latency at the cost of CPU.
   * 25 ms is invisible to the user and well under any RTT.
   */
  readonly pollMs?: number;
}

const DEFAULT: Required<WaitOptions> = {
  settleMs: 50,
  maxMs: 10_000,
  pollMs: 25,
};

/**
 * Generic wait built on a request-graph listener: poll a `checker`,
 * track every outgoing request, and resolve as soon as both
 *   1. checker returns `true`, AND
 *   2. no new request has fired for `settleMs` since the condition
 *      first held.
 *
 * On a static site the listener never fires, so the wait returns on
 * the first poll where the checker passes — usually <1 frame. On a
 * dynamic page it absorbs the in-flight fetches with no blind
 * timeouts.
 *
 * @param page Playwright page used as the request listener source.
 * @param checker Async predicate. MUST NOT throw — wrap risky reads
 *   in `.catch(() => false)`.
 * @param options Tunables (rarely needed).
 * @throws when the maxMs ceiling is hit; the message names the last
 *   request URL so you can identify a runaway fetch.
 */
export const waitForCondition = async (
  page: Page,
  checker: () => Promise<boolean>,
  options: WaitOptions = {},
): Promise<void> => {
  const { settleMs, maxMs, pollMs } = { ...DEFAULT, ...options };
  const startedAt = Date.now();
  let lastRequestAt = 0;
  let lastRequestUrl = '';
  const onRequest = (req: { url: () => string }): void => {
    lastRequestAt = Date.now();
    lastRequestUrl = req.url();
  };
  page.on('request', onRequest);
  try {
    let metAt: number | undefined;
    while (true) {
      const now = Date.now();
      if (now - startedAt > maxMs) {
        throw new Error(
          `waitForCondition timed out after ${maxMs}ms; last request ${lastRequestUrl || '(none)'}`,
        );
      }
      const met = await checker();
      const sinceRequest = now - lastRequestAt;
      const sinceMet = metAt === undefined ? 0 : now - metAt;
      if (met) {
        metAt ??= now;
        if (lastRequestAt === 0 || sinceRequest >= settleMs || sinceMet >= settleMs) {
          return;
        }
      } else {
        metAt = undefined;
      }
      await new Promise((resolve) => globalThis.setTimeout(resolve, pollMs));
    }
  } finally {
    page.off('request', onRequest);
  }
};
