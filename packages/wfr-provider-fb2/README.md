# @web-file-reader/provider-fb2

FictionBook (FB2) provider for the [web-file-reader] viewer.

Parses FB2 XML into sanitized HTML, emitting **one page per top-level `<section>`**
(or a single page when the body has none). The heavy renderer is loaded lazily —
only the tiny descriptor is registered up front.

```ts
import { descriptor } from '@web-file-reader/provider-fb2';
registry.register(descriptor);
```

## Settings

| key     | type   | default     | description                          |
| ------- | ------ | ----------- | ------------------------------------ |
| `pages` | select | `'section'` | `section` (per section) or `single`. |

Output HTML is sanitized with DOMPurify. Handles `.fb2` files and the
`application/x-fictionbook+xml` MIME type.
