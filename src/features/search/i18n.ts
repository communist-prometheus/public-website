import type { SearchSection } from '@prometheus/search-core';

/*
 * Search chrome lives here rather than in the `common` collection on
 * purpose. That collection's field set is mirrored by admin-website and
 * policed by a cross-repo drift guard, so four UI labels would cost a
 * content-repo commit and an admin release before the feature could ship
 * at all. `links.astro` sets the precedent for a page that localises its
 * own chrome. Moving these into the content repo later is additive.
 */

/** The strings the search UI needs, per language. */
export interface SearchStrings {
  readonly label: string;
  readonly placeholder: string;
  readonly noResults: string;
  readonly resultsTitle: string;
  readonly sections: Readonly<Record<SearchSection, string>>;
}

const EN: SearchStrings = {
  label: 'Search',
  placeholder: 'Search articles…',
  noResults: 'Nothing found.',
  resultsTitle: 'Search',
  sections: {
    blog: 'Blog',
    positions: 'Positions',
    magazine: 'Magazine',
    archive: 'Archive',
    page: 'Page',
  },
};

const STRINGS: Readonly<Record<string, SearchStrings>> = {
  en: EN,
  ru: {
    label: 'Поиск',
    placeholder: 'Искать по статьям…',
    noResults: 'Ничего не найдено.',
    resultsTitle: 'Поиск',
    sections: {
      blog: 'Блог',
      positions: 'Позиции',
      magazine: 'Журнал',
      archive: 'Архив',
      page: 'Страница',
    },
  },
  it: {
    label: 'Cerca',
    placeholder: 'Cerca negli articoli…',
    noResults: 'Nessun risultato.',
    resultsTitle: 'Ricerca',
    sections: {
      blog: 'Blog',
      positions: 'Posizioni',
      magazine: 'Rivista',
      archive: 'Archivio',
      page: 'Pagina',
    },
  },
  es: {
    label: 'Buscar',
    placeholder: 'Buscar artículos…',
    noResults: 'No se encontró nada.',
    resultsTitle: 'Búsqueda',
    sections: {
      blog: 'Blog',
      positions: 'Posiciones',
      magazine: 'Revista',
      archive: 'Archivo',
      page: 'Página',
    },
  },
};

/**
 * Search chrome for a language, falling back to English when the
 * language has no translation yet — the same contract every other label
 * on this site follows.
 * @param lang Active page language.
 * @returns The strings to render.
 */
export const searchStrings = (lang: string): SearchStrings => STRINGS[lang] ?? EN;
