---
title: Rich Media in Blog Posts
description: A showcase of different media types supported in Prometheus blog articles — raster images, vector graphics, video, and audio.
category: Technology
pubDate: 2024-02-10
image: ./assets/cover.jpg
lang: en
---

# Rich Media in Blog Posts

Prometheus blog supports a wide range of embedded media. This article demonstrates each type and how it renders within the content area.

![image.png](./assets/image.png)

## Raster Photography

Standard photographs and raster images are automatically optimized by Astro — converted to modern formats (AVIF, WebP) and served in multiple sizes for responsive loading.

![A landscape scene with sky and green terrain](./assets/landscape.jpg)

Raster images work well for photographs, screenshots, and any content with complex color gradients. Astro processes them at build time, so there is zero runtime overhead.

## Vector Graphics

SVG images are ideal for diagrams, icons, and technical illustrations. They scale to any size without losing quality and have tiny file sizes.

![Component architecture diagram showing the blog system structure](./assets/architecture.svg)

Vector images are particularly useful for:

- **Architecture diagrams** — like the one above
- **Flowcharts** and decision trees
- **Icons** and brand assets
- **Data visualizations** and charts

## Video

Embedded video allows for tutorials, demos, and visual storytelling. The player supports standard controls — play, pause, volume, fullscreen.

<video controls preload="metadata" width="100%">
  <source src="./assets/demo.mp4" type="video/mp4" />
  Your browser does not support the video element.
</video>

Video files are stored in the article's `assets/` folder and served automatically at build time. For production use, consider a CDN or adaptive streaming for larger files.

## Audio

Audio embeds are useful for podcasts, music samples, or narration. The native browser player provides playback controls.

<audio controls preload="metadata">
  <source src="./assets/sample.m4a" type="audio/mp4" />
  Your browser does not support the audio element.
</audio>

Audio files follow the same strategy as video — stored in `assets/` and resolved at build time.

## Media Best Practices

When adding media to articles, keep these guidelines in mind:

1. **Images**: Place in the article's `assets/` folder — Astro optimizes them automatically
2. **Vector graphics**: Use SVG for diagrams and illustrations
3. **Video**: Keep files small or use external hosting for longer content
4. **Audio**: Provide captions or transcripts for accessibility
5. **Alt text**: Always describe visual content for screen readers