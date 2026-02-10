# Integration Guide: @communist-prometheus/cp-components

## Installation

After the package is published to GitHub Packages, install it:

```bash
# Configure npm to use GitHub Packages for @communist-prometheus scope
echo "@communist-prometheus:registry=https://npm.pkg.github.com" >> .npmrc

# Install the package
bun add @communist-prometheus/cp-components
```

## Authentication

Create `.npmrc` in the project root:

```
@communist-prometheus:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Usage in Astro

### 1. Import components in your layout or page

```astro
---
import '@communist-prometheus/cp-components';
---

<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <cp-button variant="primary">Click me</cp-button>
    
    <cp-card hoverable elevated>
      <h2>Card Title</h2>
      <p>Card content</p>
    </cp-card>
  </body>
</html>
```

### 2. With client-side hydration

```astro
<cp-button client:load variant="secondary" size="lg">
  Large Button
</cp-button>
```

### 3. Using design tokens

```typescript
import { colors, spacing } from '@communist-prometheus/cp-components/tokens';

console.log(colors.light.accent); // hsl(250, 84%, 54%)
console.log(spacing.md); // 1.5rem
```

## CSS Custom Properties

Components use CSS custom properties that can be themed:

```css
:root {
  /* Colors */
  --cp-color-accent: hsl(250, 84%, 54%);
  --cp-color-accent-hover: hsl(250, 84%, 48%);
  --cp-color-background: hsl(0, 0%, 100%);
  --cp-color-surface: hsl(0, 0%, 98%);
  --cp-color-text-primary: hsl(0, 0%, 13%);
  --cp-color-text-secondary: hsl(0, 0%, 40%);
  --cp-color-border: hsl(0, 0%, 90%);
  
  /* Spacing */
  --cp-spacing-xs: 0.5rem;
  --cp-spacing-sm: 1rem;
  --cp-spacing-md: 1.5rem;
  --cp-spacing-lg: 2rem;
  
  /* Radius */
  --cp-radius-sm: 0.5rem;
  --cp-radius-md: 0.75rem;
  
  /* Shadows */
  --cp-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --cp-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  
  /* Transitions */
  --cp-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

:root[data-theme="dark"] {
  --cp-color-background: hsl(0, 0%, 10%);
  --cp-color-surface: hsl(0, 0%, 13%);
  --cp-color-text-primary: hsl(0, 0%, 95%);
  --cp-color-text-secondary: hsl(0, 0%, 65%);
  --cp-color-border: hsl(0, 0%, 25%);
}
```

## Component APIs

### `<cp-button>`

**Attributes:**
- `variant`: `"primary" | "secondary" | "ghost"` (default: `"primary"`)
- `size`: `"sm" | "md" | "lg"` (default: `"md"`)
- `disabled`: `boolean` (default: `false`)
- `type`: `"button" | "submit" | "reset"` (default: `"button"`)

**Events:**
- `cp-click`: Custom event fired on click (detail: `{ originalEvent }`)

**Example:**
```html
<cp-button 
  variant="primary" 
  size="lg"
  @cp-click="${handleClick}">
  Submit
</cp-button>
```

### `<cp-card>`

**Attributes:**
- `hoverable`: `boolean` (default: `false`) - Makes card clickable with hover effects
- `elevated`: `boolean` (default: `false`) - Adds shadow elevation

**Events:**
- `cp-card-click`: Custom event fired when hoverable card is clicked

**Example:**
```html
<cp-card hoverable elevated @cp-card-click="${handleCardClick}">
  <h3>Interactive Card</h3>
  <p>Click me!</p>
</cp-card>
```

## TypeScript Support

Full TypeScript support with declaration files:

```typescript
import type { CpButton, CpCard } from '@communist-prometheus/cp-components';

const button = document.querySelector('cp-button') as CpButton;
button.variant = 'secondary';
```

## Next Steps

After installation:
1. Replace existing button/card implementations with web components
2. Migrate CSS tokens to use component design tokens
3. Add event listeners for interactive components
4. Customize theme via CSS custom properties
