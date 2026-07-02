# @web-file-reader/provider-pdf

PDF provider for [web-file-reader].

Renders PDF documents with [pdf.js](https://github.com/mozilla/pdf.js). The `descriptor` is cheap and dependency-free; the heavy renderer (and `pdfjs-dist`) is pulled in only when a PDF is actually opened.

## Usage

```ts
import { descriptor as pdf } from '@web-file-reader/provider-pdf';
import { createProviderRegistry } from '@web-file-reader/core';

const registry = createProviderRegistry();
registry.register(pdf);
```

`canHandle` matches a `pdf` file extension or the `application/pdf` MIME type.

## Settings

- **scale** (number, default `1.2`, range `0.5`–`4`, step `0.1`) — page render scale.
- **pageMode** (select, default `all`) — `all` renders every page as multi-page content; `single` renders only the first page.

## Lazy pdf.js

`descriptor.load()` dynamically imports `./lazy`, which is the only module that imports `pdfjs-dist`. Importing the descriptor never pulls pdf.js into your bundle.

## Worker

pdf.js needs a worker. On first render the provider sets `GlobalWorkerOptions.workerSrc` to a URL resolved from `pdfjs-dist/build/pdf.worker.min.mjs` via `import.meta.url`, so a bundler that understands `new URL(..., import.meta.url)` will emit the worker automatically. It is configured once and reused across renders.

