# @web-file-reader/provider-csv

CSV / TSV provider for [web-file-reader].

Parses delimited text into an accessible HTML `<table>` and exposes it as viewer content. It matches files by extension (`csv`, `tsv`) or MIME type (`text/csv`, `text/tab-separated-values`). The heavy parsing/rendering lives behind a lazy import — only the cheap `descriptor` is registered eagerly.

## Usage

```ts
import { descriptor } from '@web-file-reader/provider-csv';
import { createProviderRegistry } from '@web-file-reader/core';

const registry = createProviderRegistry();
registry.register(descriptor);
```

## Settings

- **Delimiter** (`delimiter`, default `auto`) — `auto` detects the delimiter from the first line; or force `comma`, `semicolon`, `tab`, or `pipe`.
- **First row is header** (`header`, default `true`) — render the first row as `<thead>` with column-scoped `<th>` cells.
- **Rows per page** (`rowsPerPage`, default `0`, range `0–1000`) — see below.

## Single vs. multi page

With `rowsPerPage = 0` the provider emits a single page containing every body row. With `rowsPerPage > 0` it emits multiple pages, chunking the body rows and repeating the header on each page; each page is labelled `Rows a–b`.

## Safety

The parser is a small hand-rolled state machine (quoted fields, embedded delimiters/newlines, escaped `""`, CRLF/LF) — no external dependency. Every cell value is HTML-escaped before insertion, so untrusted file content can never inject markup into the produced table.

