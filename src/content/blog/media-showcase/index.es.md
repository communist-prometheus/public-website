---
title: Contenido multimedia en el blog
description: Una muestra de los diferentes tipos de medios compatibles en los artículos del blog Prometheus — imágenes rasterizadas, gráficos vectoriales, video y audio.
category: Tecnología
pubDate: 2024-02-10
image: ./assets/cover.jpg
lang: es
---

# Contenido multimedia en el blog

El blog de Prometheus admite una amplia gama de contenido multimedia incrustado. Este artículo demuestra cada tipo y cómo se renderiza dentro del área de contenido.

## Fotografía rasterizada

Las fotografías estándar y las imágenes rasterizadas se optimizan automáticamente con Astro — se convierten a formatos modernos (AVIF, WebP) y se sirven en múltiples tamaños para carga responsive.

![Una escena paisajística con cielo y terreno verde](./assets/landscape.jpg)

Las imágenes rasterizadas funcionan bien para fotografías, capturas de pantalla y cualquier contenido con gradientes de color complejos. Astro las procesa en tiempo de compilación, por lo que no hay sobrecarga en tiempo de ejecución.

## Gráficos vectoriales

Las imágenes SVG son ideales para diagramas, iconos e ilustraciones técnicas. Se escalan a cualquier tamaño sin perder calidad y tienen tamaños de archivo diminutos.

![Diagrama de arquitectura de componentes del sistema del blog](./assets/architecture.svg)

Las imágenes vectoriales son particularmente útiles para:

- **Diagramas de arquitectura** — como el de arriba
- **Diagramas de flujo** y árboles de decisión
- **Iconos** y recursos de marca
- **Visualizaciones de datos** y gráficos

## Video

El video incrustado permite tutoriales, demos y narración visual. El reproductor admite controles estándar — reproducir, pausar, volumen, pantalla completa.

<video controls preload="metadata" width="100%">
  <source src="./assets/demo.mp4" type="video/mp4" />
  Tu navegador no soporta el elemento video.
</video>

Los archivos de video se sirven como recursos estáticos desde el directorio `public/`. Para producción, considera un CDN o streaming adaptativo para archivos más grandes.

## Audio

Los embeds de audio son útiles para podcasts, muestras musicales o narración. El reproductor nativo del navegador proporciona controles de reproducción.

<audio controls preload="metadata">
  <source src="./assets/sample.m4a" type="audio/mp4" />
  Tu navegador no soporta el elemento audio.
</audio>

Los archivos de audio siguen la misma estrategia de servicio que el video — recursos estáticos con reproducción nativa del navegador.

## Mejores prácticas para medios

Al agregar medios a los artículos, ten en cuenta estas pautas:

1. **Imágenes**: Colócalas en la carpeta `assets/` del artículo — Astro las optimiza automáticamente
2. **Gráficos vectoriales**: Usa SVG para diagramas e ilustraciones
3. **Video**: Mantén los archivos pequeños o usa hosting externo para contenido más largo
4. **Audio**: Proporciona subtítulos o transcripciones para la accesibilidad
5. **Texto alternativo**: Siempre describe el contenido visual para lectores de pantalla
