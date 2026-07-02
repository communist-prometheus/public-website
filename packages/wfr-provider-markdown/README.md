# @web-file-reader/provider-markdown

Markdown / plain-text provider for [web-file-reader].

Resolves a file's text from any `FileSource` (text, url, blob, bytes) and turns it into a single sanitized HTML page for `<wfr-viewer>`. It claims `.md`, `.markdown`, `.txt`, `.text` files and the `text/markdown` / `text/plain` MIME types.

## Usage

```ts
import { createProviderRegistry } from '@web-file-reader/core';
import { descriptor } from '@web-file-reader/provider-markdown';

const registry = createProviderRegistry();
registry.register(descriptor);
```

## Settings

- **gfm** (boolean, default `true`) — enable GitHub Flavored Markdown.
- **breaks** (boolean, default `false`) — render single line breaks as `<br>`.
- **view** (`rendered` | `source`, default `rendered`) — show parsed markdown or the raw, escaped source in a `<pre><code>` block.

## Lazy loading

The eagerly-registered `descriptor` is dependency-light: it never imports the parser. `marked` and `dompurify` are pulled in only when `descriptor.load()` is first called (the `./lazy` entry), so a registry of many providers stays cheap.

## Security

Rendered markdown is always passed through `DOMPurify.sanitize`, and source view escapes `&`, `<`, `>` before embedding the text. The viewer treats `html` content as pre-sanitized, so this provider owns sanitization — do not bypass it when customizing.

