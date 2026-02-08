# Prometheus Public Website

Static website built with Astro and deployed on Cloudflare Pages with automatic rebuild capabilities.

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

| Command              | Action                                              |
| :------------------- | :-------------------------------------------------- |
| `bun install`        | Installs dependencies                               |
| `bun run dev`        | Starts local dev server at `localhost:4321`         |
| `bun run build`      | Build production site to `./dist/`                  |
| `bun run preview`    | Preview build locally                               |
| `bun run pages:dev`  | Preview with Cloudflare Pages environment           |
| `bun run pages:deploy` | Deploy to Cloudflare Pages                        |
| `bun run test:webhook` | Test webhook endpoint                             |

## 🔄 Auto-Rebuild System

The site supports automatic rebuilds when content is updated via webhook. See [`documentation/user/auto-rebuild-setup.md`](documentation/user/auto-rebuild-setup.md) for detailed setup instructions.

**Quick Start:**
1. Deploy to Cloudflare Pages
2. Configure `GITHUB_TOKEN` and `WEBHOOK_SECRET` environment variables
3. Send POST requests to `/api/webhook` to trigger content updates and rebuilds

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
