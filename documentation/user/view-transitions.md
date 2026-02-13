# View Transitions

Two independent view transition animations coexist in this project. They are isolated via `active-view-transition-type()` CSS selector so they never interfere with each other.

## 1. Theme Toggle — Circular Reveal

Triggered by clicking the theme toggle button in the header.

### Flow

1. `ThemeToggle.astro` calls `document.startViewTransition({ update, types: ['theme'] })`
2. Click coordinates are stored as CSS custom properties `--x`, `--y`, `--r` on `<html>`
3. CSS animates `::view-transition-new(root)` with a `clip-path: circle()` expanding from the click point

### CSS (`theme.css`)

```css
html:active-view-transition-type(theme) {
  view-transition-name: root;

  /* Collapse main into root group — prevents independent cross-fade */
  main {
    view-transition-name: none;
  }
}

/* Old snapshot stays static, new snapshot reveals over it */
html:active-view-transition-type(theme)::view-transition-old(root) {
  animation: none;
  z-index: 1;
}

html:active-view-transition-type(theme)::view-transition-new(root) {
  animation: reveal 0.5s ease-in-out forwards;
  z-index: 2;
}

@keyframes reveal {
  from { clip-path: circle(0 at var(--x, 50%) var(--y, 50%)); }
  to   { clip-path: circle(var(--r, 100vmax) at var(--x, 50%) var(--y, 50%)); }
}
```

### Key detail: `main { view-transition-name: none }`

Without this, `<main>` has its own view transition group (`main-content`) and would cross-fade independently instead of being covered by the circular reveal clip-path. Setting it to `none` during theme toggle merges it into the `root` snapshot.

## 2. SPA Navigation — Slide

Triggered automatically by Astro's `<ClientRouter />` on every page navigation.

### Flow

1. `<ClientRouter />` intercepts link clicks, fetches new page HTML
2. Header and footer persist across navigations (`transition:persist`)
3. Only `<main>` content swaps, animated with slide-out/slide-in

### CSS (`theme.css`)

```css
/* Only during navigation (NOT during theme toggle) */
html:not(:active-view-transition-type(theme))::view-transition-old(main-content) {
  animation: slide-out 0.3s ease-out forwards;
}

html:not(:active-view-transition-type(theme))::view-transition-new(main-content) {
  animation: slide-in 0.3s ease-out forwards;
}
```

### Layout (`BaseLayout.astro`)

```css
main {
  view-transition-name: main-content;
}
```

## 3. Theme Persistence Across Navigation

`<script is:inline>` in `<head>` runs before first paint:

```js
document.documentElement.dataset['theme'] = getTheme();
document.addEventListener('astro:before-swap', function (e) {
  e.newDocument.documentElement.dataset['theme'] = getTheme();
});
```

`astro:before-swap` sets `data-theme` on the **incoming** document before DOM swap. This prevents a flash where new elements briefly render with light-theme defaults.

## File Map

| File | Role |
|------|------|
| `src/styles/theme.css` | CSS variables, view transition animations, keyframes |
| `src/layouts/BaseLayout.astro` | `<ClientRouter />`, theme init script, `main-content` view-transition-name |
| `src/features/theme/components/ThemeToggle.astro` | `startViewTransition()` call with click coordinates |
| `src/features/navigation/components/Header.astro` | `transition:persist="header"` |
| `src/features/navigation/components/Footer.astro` | `transition:persist="footer"` |

## Constraints

- **No `transition: all`** on interactive elements. Use explicit properties (`background-color`, `color`, `border-color`) to prevent flash during SPA navigation when CSS variables change.
- Theme must be applied via `astro:before-swap` (not `after-swap`) to avoid FOUC.
- `main { view-transition-name: none }` is scoped to theme toggle only — navigation still needs the `main-content` group for slide animation.
