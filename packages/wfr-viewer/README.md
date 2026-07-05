# @web-file-reader/viewer

Headless Lit file viewer for [web-file-reader].

`<wfr-viewer>` resolves a provider for its `.file` from a `.registry`, lazily loads the renderer, and paints the resulting content into a scrollable surface. It supports **normal** and **fullscreen** modes; single- and multi-page output both scroll in either mode.

## Usage

```ts
import '@web-file-reader/viewer';
import { createProviderRegistry } from '@web-file-reader/core';

const registry = createProviderRegistry();
registry.register(/* a ProviderDescriptor */);

const viewer = document.querySelector('wfr-viewer');
viewer.registry = registry;
viewer.file = someFile;          // triggers lazy load + render
viewer.settings = { scale: 1.5 };// merged over the provider defaults
await viewer.toggleFullscreen();
```

## Render strategies

Providers return `PageContent` as `html` (pre-sanitized string), `node` (DOM node), or `mount` (imperative callback returning optional cleanup) — so canvas-based renderers like pdf.js work without bundling a sanitizer into the viewer.

## Customize

- **Slots**: `toolbar`, `controls`, `loading`, `error`.
- **Parts**: `root`, `surface`, `pages`, `page`, `loading`, `error`.
- **Custom properties**: `--wfr-page-gap`, `--wfr-fullscreen-bg`, `--wfr-focus-outline`.
- **Events**: `wfr-viewer-load`, `wfr-viewer-error`.

