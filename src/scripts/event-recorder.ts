/**
 * Inline event recorder (~500 bytes minified).
 * Captures user interactions on deferred-hydration components
 * and replays them after hydration completes.
 *
 * Must be loaded synchronously in <head> via is:inline.
 */
const CAPTURED_EVENTS = ['click', 'keydown'] as const;

interface RecordedEvent {
  readonly target: EventTarget;
  readonly event: Event;
}

const recorded: RecordedEvent[] = [];

const record = (event: Event): void => {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest('[defer-hydration]')) {
    recorded.push({ target, event });
  }
};

for (const type of CAPTURED_EVENTS) {
  document.addEventListener(type, record, { capture: true });
}

(globalThis as Record<string, unknown>).__cpEventReplay = {
  replay: (): void => {
    for (const type of CAPTURED_EVENTS) {
      document.removeEventListener(type, record, { capture: true });
    }
    for (const { target, event } of recorded) {
      target.dispatchEvent(new event.constructor(event.type, event));
    }
    recorded.length = 0;
  },
};
