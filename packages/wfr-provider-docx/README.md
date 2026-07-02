# @web-file-reader/provider-docx

DOCX (Word) provider for the [web-file-reader] viewer.

Unzips the `.docx` (an OOXML zip) with `fflate`, reads `word/document.xml`, and
maps paragraphs, runs (bold/italic/underline), headings and simple tables to
sanitized HTML. No heavyweight converter dependency. Loaded lazily.

```ts
import { descriptor } from '@web-file-reader/provider-docx';
registry.register(descriptor);
```

## Settings

| key    | type   | default      | description                          |
| ------ | ------ | ------------ | ------------------------------------ |
| `view` | select | `'rendered'` | `rendered` HTML or raw `source` XML. |

Output HTML is sanitized with DOMPurify. Handles `.docx` files and the OOXML
WordprocessingML MIME type.
