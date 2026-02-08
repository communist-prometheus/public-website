# Prometheus - Modern Multilingual Blog Platform

A feature-oriented, multilingual blog platform built with Astro 5, showcasing modern web development practices with minimal TypeScript and maximum use of web platform features.

## ✨ Features

- 🌍 **Multilingual Support**: Native i18n with English and Russian
- 🎨 **Dark/Light Theme**: System-aware theme switching with manual toggle
- 📝 **Content Collections**: Type-safe Markdown-based content management
- 🎯 **Feature-Oriented Architecture**: Deep component tree organized by feature
- 🚀 **Performance First**: Static site generation with zero JavaScript by default
- ♿ **Accessibility**: WCAG compliant, keyboard navigable, semantic HTML
- 🎭 **Modern CSS**: CSS custom properties, grid, flexbox, container queries
- 🔧 **Type Safety**: Full TypeScript support with strict mode
- 📦 **Minimal Dependencies**: Leveraging web platform capabilities

## 🏗️ Architecture Principles

### Feature-Oriented Structure

Components are organized by feature, not by type. Each feature contains all its related components, creating a deep, logical tree structure:

```
src/
├── features/
│   ├── blog/
│   │   ├── components/
│   │   │   ├── PostCard.astro
│   │   │   └── CategoryFilter.astro
│   │   └── helpers/
│   │       └── getBlogPosts.ts
│   ├── home/
│   │   └── components/
│   │       ├── Hero.astro
│   │       └── NewsSection.astro
│   ├── navigation/
│   │   └── components/
│   │       ├── Header.astro
│   │       ├── Nav.astro
│   │       └── Footer.astro
│   └── theme/
│       └── components/
│           └── ThemeToggle.astro
```

### Minimal Component Size

Each component contains only:
- Top-level child elements
- Minimal logic (complex logic goes to services/helpers)
- Layout definition for children

All nested elements are extracted into separate components, creating a composable architecture.

### Declarative Styling

Styling is based on:
- **CSS Custom Properties**: All theme values defined as CSS variables
- **Utility Classes**: Reusable layout and spacing utilities
- **Component-Scoped Styles**: Each component only redefines theme parameters
- **Theme Mixins**: Shared styling patterns via custom properties

```css
/* Theme parameters */
:root {
  --color-accent: hsl(250, 84%, 54%);
  --spacing-md: 1.5rem;
  --radius-md: 0.75rem;
}

/* Components use theme parameters */
.card {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

### Modern Web Platform APIs

Leveraging native capabilities:
- **CSS Grid & Flexbox**: For layouts
- **CSS Custom Properties**: For theming
- **View Transitions API**: For smooth page transitions (future)
- **Container Queries**: For responsive components
- **CSS Nesting**: For better style organization

### Minimal TypeScript

TypeScript is used for:
- Type safety in content collections
- Configuration files
- Helper functions requiring strong typing

UI components primarily use Astro's template syntax, minimizing TS overhead.

## 📁 Project Structure

```
src/
├── config/
│   └── i18n.ts              # Language configuration
├── content/
│   ├── blog/                # Blog posts (user-editable)
│   │   ├── *.en.md
│   │   └── *.ru.md
│   ├── pages/               # Static pages content
│   │   ├── manifest.en.md
│   │   └── manifest.ru.md
│   └── config.ts            # Content collections schema
├── features/                # Feature-based organization
│   ├── blog/
│   ├── home/
│   ├── navigation/
│   └── theme/
├── layouts/
│   └── BaseLayout.astro     # Base HTML structure
├── pages/
│   ├── [lang]/              # Localized pages
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   └── manifest.astro
│   └── index.astro          # Root redirect
└── styles/
    ├── theme.css            # Theme system
    └── utilities.css        # Utility classes
```

## 🎨 Theme System

### Light/Dark Mode

Theme switching via CSS custom properties:

```css
:root {
  --color-background: hsl(0, 0%, 100%);
  --color-text-primary: hsl(0, 0%, 13%);
}

:root[data-theme='dark'] {
  --color-background: hsl(0, 0%, 10%);
  --color-text-primary: hsl(0, 0%, 95%);
}
```

State persisted in `localStorage`, applied via `data-theme` attribute.

### Design Tokens

All design values centralized as CSS custom properties:
- Colors (background, surface, text, accent, borders)
- Spacing (xs, sm, md, lg, xl, 2xl)
- Border radius (sm, md, lg)
- Typography (font families, sizes)
- Shadows (sm, md, lg)
- Transitions (fast, base)

## 🌍 Internationalization

### Content Strategy

- All pages exist under `[lang]` dynamic routes
- Blog posts use `*.{lang}.md` naming convention
- Static content in `content/pages/` by language
- UI strings defined inline per component

### Supported Languages

Configured in `src/config/i18n.ts`:
- `en` - English (default)
- `ru` - Russian

Add languages by:
1. Adding to `SUPPORTED_LANGUAGES` array
2. Creating corresponding content files
3. Adding UI translations in components

## 📝 Content Management

### Adding Blog Posts

1. Create files in `src/content/blog/`:
   - `my-post.en.md`
   - `my-post.ru.md`

2. Include frontmatter:
```markdown
---
title: Post Title
description: Brief description
category: Technology
pubDate: 2024-01-15
lang: en
image: ./images/cover.jpg  # Optional
---

Your content here...
```

3. Images go in same directory as post

### Category Filtering

Categories auto-populate from post metadata. Click category on blog page to filter.

## 🛠️ Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Type check
bun run check

# Lint code
bun run lint

# Format code
bun run format

# Build for production
bun run build

# Preview production build
bun run preview
```

## 🔍 Code Quality

### Linting & Formatting

- **Biome**: Fast linter and formatter (Prettier alternative)
- **TypeScript**: Strict mode with additional checks
- **Husky**: Pre-commit hooks for automated checks
- **lint-staged**: Only lint changed files

### Pre-commit Hooks

Automatically runs on `git commit`:
- Code formatting
- Linting
- Type checking

## 🚀 Performance

### Optimization Strategies

- **Static Generation**: All pages pre-rendered at build time
- **Zero JS by Default**: Only interactive components ship JS
- **Image Optimization**: Automatic via Astro image service
- **CSS Scoping**: Component-level CSS prevents bloat
- **Content Collections**: Type-safe, optimized content queries

### Web Vitals

Target metrics:
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

## 📚 Tech Stack

- **Framework**: Astro 5
- **Language**: TypeScript (minimal)
- **Styling**: Modern CSS with custom properties
- **Linting**: Biome
- **Git Hooks**: Husky + lint-staged
- **Package Manager**: Bun

## 🎯 Best Practices

1. **Minimal Components**: Extract nested elements
2. **Theme-Based Styling**: Use CSS custom properties
3. **Type Safety**: Leverage content collections schemas
4. **Accessibility**: Semantic HTML, ARIA when needed
5. **Performance**: Static-first, progressive enhancement
6. **Feature Organization**: Deep trees by feature domain
7. **Modern Platform**: Use native web APIs over JS libraries

## 📄 License

All rights reserved.
