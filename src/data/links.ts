/**
 * Curated external links — the "Resources & allies" directory.
 *
 * Single source for the `/[lang]/links` page. The `organizations`
 * group mirrors the webring members
 * (cdn.comprom.org/members.json); `resources` (archives/libraries)
 * and `friendly` (allied but non-internationalist-communist) are
 * page-only and intentionally NOT in the ring.
 *
 * Descriptions are Russian for now (the list was authored in
 * Russian); the `lang` badge tells the reader each site's own
 * language. Localising descriptions is a later enhancement.
 */
export interface LinkEntry {
  readonly url: string;
  readonly name: string;
  /** BCP-47 primary language of the target site (shown as a badge). */
  readonly lang: string;
  readonly description: string;
}

export interface LinkGroup {
  readonly id: string;
  readonly entries: readonly LinkEntry[];
}

/** Archives & libraries — reference material, not ring members. */
const resources: readonly LinkEntry[] = [
  {
    url: 'https://www.marxists.org/',
    name: 'Marxists Internet Archive',
    lang: 'en',
    description: 'Марксистский интернет-архив.',
  },
  {
    url: 'https://www.sinistra.net/',
    name: 'Sinistra',
    lang: 'it',
    description: 'Онлайн-архив коммунистической левой.',
  },
  {
    url: 'https://libcom.org/',
    name: 'libcom.org',
    lang: 'en',
    description: 'Новости и анализ борьбы рабочих, дискуссии и постоянно растущий архив.',
  },
  {
    url: 'https://www.daadengedachte.nl/',
    name: 'Daad en Gedachte',
    lang: 'nl',
    description: 'Архив прекратившего существование голландского левокоммунистического журнала.',
  },
  {
    url: 'https://alter-maulwurf.de/',
    name: 'Alter Maulwurf',
    lang: 'de',
    description: 'Тексты Амадео Бордиги на немецком языке.',
  },
  {
    url: 'https://redtexts.org/',
    name: 'redtexts.org',
    lang: 'en',
    description: 'Архив коммунистических текстов.',
  },
  {
    url: 'https://www.aaap.be/Pages/Frontpage.html',
    name: 'Anton Pannekoek Archives',
    lang: 'en',
    description: 'Архив Антона Паннекука.',
  },
];

/** Internationalist / left-communist organisations & publications. */
const organizations: readonly LinkEntry[] = [
  {
    url: 'https://www.leftcom.org/',
    name: 'Internationalist Communist Tendency',
    lang: 'en',
    description: 'Интернациональная коммунистическая тенденция.',
  },
  {
    url: 'http://www.igcl.org/',
    name: 'International Group of the Communist Left',
    lang: 'en',
    description: 'Интернациональная группа коммунистической левой (Revolution or War).',
  },
  {
    url: 'https://barbaria.net/',
    name: 'Barbaria',
    lang: 'es',
    description: 'Испанская левокоммунистическая группа.',
  },
  {
    url: 'https://balanceyavante1.wordpress.com/',
    name: 'Balance y Avante',
    lang: 'es',
    description: 'Испанская левокоммунистическая группа.',
  },
  {
    url: 'https://internationalistcommunists.org/',
    name: 'League of Internationalist Communists',
    lang: 'en',
    description: 'Лига интернационалистических коммунистов.',
  },
  {
    url: 'https://leftdis.wordpress.com/',
    name: 'Left Discussions',
    lang: 'en',
    description: 'Левокоммунистический сайт.',
  },
  {
    url: 'https://arbeidersstemmen.nl/',
    name: 'Arbeidersstemmen (NL)',
    lang: 'nl',
    description: 'Левокоммунистическое онлайн-издание на голландском.',
  },
  {
    url: 'https://arbeidersstemmen.wordpress.com/',
    name: 'Arbeidersstemmen (DE)',
    lang: 'de',
    description: 'Левокоммунистическое онлайн-издание на немецком.',
  },
  {
    url: 'https://inter-rev.foroactivo.com/',
    name: 'Inter-Rev — Foro de la Izquierda Comunista',
    lang: 'es',
    description: 'Форум интернационалистических коммунистических левых на испанском.',
  },
  {
    url: 'https://www.leftcommunism.org/',
    name: 'Left Communism Forum',
    lang: 'en',
    description: 'Форум интернационалистических коммунистических левых.',
  },
  {
    url: 'https://en.internationalism.org/',
    name: 'International Communist Current',
    lang: 'en',
    description: 'Интернациональное коммунистическое течение (ICC).',
  },
  {
    url: 'https://www.internationalcommunistparty.org/index.php/it/',
    name: 'International Communist Party (.org)',
    lang: 'it',
    description: 'Одна из бордигистских Интернациональных коммунистических партий.',
  },
  {
    url: 'https://www.international-communist-party.org/',
    name: 'International Communist Party (-party.org)',
    lang: 'en',
    description: 'Ещё одна из бордигистских Интернациональных коммунистических партий.',
  },
  {
    url: 'https://www.pcielcomunista.org/index.php/es/',
    name: 'Partido Comunista Internacional (El Comunista)',
    lang: 'es',
    description: 'Ещё одна из бордигистских Интернациональных коммунистических партий.',
  },
  {
    url: 'https://www.pcint.org/',
    name: 'Partito Comunista Internazionale (Il Programma Comunista)',
    lang: 'it',
    description: 'Ещё одна из бордигистских Интернациональных коммунистических партий.',
  },
  {
    url: 'https://sinistracomunistainternazionale.com/',
    name: 'La Sinistra Comunista Internazionale',
    lang: 'it',
    description: 'Бордигистская организация.',
  },
  {
    url: 'https://www.quinterna.org/',
    name: 'n+1 / Quinterna',
    lang: 'it',
    description: "Сайт бордигистов из группы 'n+1'.",
  },
  {
    url: 'https://www.raetekommunismus.de/',
    name: 'Rätekommunismus',
    lang: 'de',
    description: 'Немецкий сайт коммунистов советов.',
  },
  {
    url: 'https://kosmoprolet.org/',
    name: 'Kosmoprolet',
    lang: 'de',
    description: 'Немецкая левокоммунистическая организация.',
  },
  {
    url: 'https://coalizioneoperaia.com/',
    name: 'Coalizione Operaia',
    lang: 'it',
    description: 'Итальянские коммунисты-интернационалисты.',
  },
  {
    url: 'https://www.prospettivamarxista.org/Home.htm',
    name: 'Prospettiva Marxista',
    lang: 'it',
    description: 'Итальянские коммунисты-интернационалисты.',
  },
  {
    url: 'https://www.che-fare.org/',
    name: 'Che Fare',
    lang: 'it',
    description: 'Итальянские коммунисты-интернационалисты.',
  },
  {
    url: 'https://colectivoobrerocomunista.wordpress.com/',
    name: 'Colectivo Obrero Comunista',
    lang: 'es',
    description: 'Мексиканские левые коммунисты.',
  },
  {
    url: 'https://www.councilist.org/landing-page',
    name: 'Councilist',
    lang: 'en',
    description: 'Коммунисты советов.',
  },
  {
    url: 'https://criticadesapiedada.com.br/',
    name: 'Crítica Desapiedada',
    lang: 'pt',
    description: 'Бразильский левокоммунистический сайт.',
  },
  {
    url: 'https://communistleft.jinbo.net/xe/',
    name: 'Internationalist Communist Perspective (Korea)',
    lang: 'ko',
    description: 'Корейская левокоммунистическая организация.',
  },
  {
    url: 'https://sonoraninternational.org/',
    name: 'Sonoran International',
    lang: 'en',
    description: 'Левые коммунисты из Тусона (Аризона).',
  },
  {
    url: 'https://shoraha.net/',
    name: 'Shoraha',
    lang: 'fa',
    description: 'Иранский левокоммунистический сайт.',
  },
  {
    url: 'https://en.internationalistvoice.org/',
    name: 'Internationalist Voice',
    lang: 'en',
    description: 'Иранская левокоммунистическая организация.',
  },
  {
    url: 'https://wpiran.org/english/',
    name: 'Worker-communist Party of Iran',
    lang: 'en',
    description: 'Рабочая партия Ирана (левокоммунистическая).',
  },
  {
    url: 'https://internationalistperspective.org/',
    name: 'Internationalist Perspective',
    lang: 'en',
    description: 'Левокоммунистическая организация.',
  },
  {
    url: 'https://medium.com/@fiovermelho1917',
    name: 'Fio Vermelho',
    lang: 'pt',
    description: 'Коммунисты-интернационалисты (португальский).',
  },
  {
    url: 'https://coletivoruptura.wordpress.com/',
    name: 'Coletivo Ruptura',
    lang: 'pt',
    description: 'Коммунисты-интернационалисты (португальский).',
  },
  {
    url: 'https://counselingcommunism.com/',
    name: 'Counseling Communism',
    lang: 'en',
    description: 'Коммунисты советов.',
  },
];

/** Allied but outside the internationalist-communist tradition. */
const friendly: readonly LinkEntry[] = [
  {
    url: 'https://www.anarchy.bg/',
    name: 'Federation of Anarcho-Communists of Bulgaria',
    lang: 'bg',
    description: 'Сайт дружественной нам Федерации анархо-коммунистов Болгарии.',
  },
];

export const LINK_GROUPS: readonly LinkGroup[] = [
  { id: 'organizations', entries: organizations },
  { id: 'resources', entries: resources },
  { id: 'friendly', entries: friendly },
];
