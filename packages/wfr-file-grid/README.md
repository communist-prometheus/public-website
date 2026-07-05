# @web-file-reader/file-grid

Headless, slots-first Lit grid of file tiles for [web-file-reader].

## Elements

- `<wfr-file-grid>` — renders a tile per file from its `.files` property; an accessible `role="list"`. Layout is a CSS grid driven by custom properties.
- `<wfr-file-tile>` — an accessible button per file; activating it dispatches a bubbling, composed `wfr-open` event.

## Usage

```ts
import '@web-file-reader/file-grid';

const grid = document.querySelector('wfr-file-grid');
grid.files = [{ id: 'a', name: 'readme.md', source: { kind: 'text', text: '# Hi' } }];
grid.addEventListener('wfr-open', (e) => console.log(e.detail.file, e.detail.index));
```

## Customize

- **Slots** (per tile): `preview`, `icon`, `label`; (grid): `empty`, default slot.
- **Parts**: `grid`, `tile`, `button`, `preview`, `icon`, `label`.
- **Custom properties**: `--wfr-grid-columns`, `--wfr-grid-min`, `--wfr-grid-gap`, `--wfr-tile-gap`, `--wfr-focus-outline`.

