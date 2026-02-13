/**
 * Client-side component activation script.
 *
 * DSD (Declarative Shadow DOM) provides instant visual rendering at parse time.
 * Before loading Lit component definitions, we clear the DSD shadow root
 * content so Lit can render fresh into the empty root (attachShadow returns
 * the existing DSD root). The visual content is identical so there is no flash.
 *
 * After components are defined, defer-hydration is removed and any
 * captured pre-hydration events are replayed.
 */

document.querySelectorAll('cp-button, cp-card').forEach((el) => {
  if (el.shadowRoot) {
    el.shadowRoot.innerHTML = '';
  }
});

const activate = (): void => {
  document.querySelectorAll('[defer-hydration]').forEach((el) => {
    el.removeAttribute('defer-hydration');
  });

  const replayHandle = (globalThis as Record<string, unknown>).__cpEventReplay as
    | { readonly replay: () => void }
    | undefined;
  replayHandle?.replay();
};

import('@communist-prometheus/cp-components')
  .then(() =>
    Promise.all([customElements.whenDefined('cp-button'), customElements.whenDefined('cp-card')]),
  )
  .then(activate);
