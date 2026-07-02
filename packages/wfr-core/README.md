# @web-file-reader/core

Headless contracts and pure logic for the [web-file-reader] viewer. No UI, no runtime dependencies.

## Contains

- **File model** — `FileDescriptor`, `FileSource`, `fileExtension`.
- **Content model** — `ViewerContent` (`single` / `multi`), `ViewerPage`, `PageContent` (`html` / `node` / `mount`), `contentPages`, `pageCount`.
- **Settings** — `SettingsSchema` / `SettingField`, `defaultsFromSchema`, `serializeSettings`, `deserializeSettings` (schema-validated, never throws).
- **Providers** — `ProviderDescriptor` (cheap, eager) + `ProviderModule` (heavy, lazy).
- **Registry** — `createProviderRegistry()`: resolves providers by priority and **loads each heavy module exactly once** (cached, dedupes concurrent loads, evicts failures).
- **Paging** — immutable `PagingState` with `goPrev` / `goNext` / `goTo` and wrap support.

## Lazy provider contract

```ts
import { createProviderRegistry } from '@web-file-reader/core';

const registry = createProviderRegistry();
registry.register({
  id: 'markdown',
  name: 'Markdown',
  canHandle: (file) => file.extension === 'md',
  // Heavy parser is imported only here — downloaded on first use, then cached.
  load: () => import('@web-file-reader/provider-markdown/lazy').then((m) => m.module),
});

const provider = await registry.load(someMarkdownFile); // downloads once
const content = await provider?.render(someMarkdownFile, settings);
```

