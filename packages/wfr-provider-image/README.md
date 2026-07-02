# @web-file-reader/provider-image

Image provider for [web-file-reader].

Renders raster and vector images (`png`, `jpg`, `jpeg`, `gif`, `webp`, `avif`, `svg`, `bmp`, `ico`, or any `image/*` MIME type) as a single scrollable page. The eager `descriptor` carries no heavy dependencies; the renderer is imported lazily on first use.

## Usage

```ts
import { descriptor } from '@web-file-reader/provider-image';
import { createProviderRegistry } from '@web-file-reader/core';

const registry = createProviderRegistry();
registry.register(descriptor);
```

The provider returns a `mount` page: it creates an `<img>`, resolves its `src` from the file source (URL passthrough, object URL for blobs/bytes, inline data URL for SVG text), and returns a cleanup that revokes any object URL and clears the container.

## Settings

| Key         | Type    | Default     | Description                                                  |
| ----------- | ------- | ----------- | ------------------------------------------------------------ |
| `fit`       | select  | `contain`   | `contain` / `cover` / `none` set `object-fit`; `width` fits to 100% width. |
| `zoom`      | number  | `1`         | Scale factor (`0.1`–`8`, step `0.1`) applied via `transform`. |
| `pixelated` | boolean | `false`     | Sets `image-rendering: pixelated` for crisp upscaling.       |

## Customize

There are no slots or parts — the provider emits a single `<img>` via a `mount` callback. Tune presentation through the settings above.

