# @web-file-reader/provider-archive

ZIP archive provider for the [web-file-reader] viewer.

Reads a `.zip` with `fflate` and renders an accessible table of its entries
(name + uncompressed size, with a count/total caption). Loaded lazily.

```ts
import { descriptor } from '@web-file-reader/provider-archive';
registry.register(descriptor);
```

## Settings

| key    | type   | default  | description              |
| ------ | ------ | -------- | ------------------------ |
| `sort` | select | `'name'` | Sort by `name` or `size`. |

Handles `.zip` files and `application/zip` / `application/x-zip-compressed`.
