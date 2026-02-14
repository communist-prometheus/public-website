import type { Language } from './i18n';

type Entry = Readonly<Record<Language, string>>;

const defineSection = <T extends Readonly<Record<string, Entry>>>(section: T): T => section;

const nav = defineSection({
  home: { en: 'Home', ru: 'Главная', it: 'Home', es: 'Inicio' },
  blog: { en: 'Blog', ru: 'Блог', it: 'Blog', es: 'Blog' },
  manifest: { en: 'Manifest', ru: 'Манифест', it: 'Manifesto', es: 'Manifiesto' },
  menu: { en: 'Menu', ru: 'Меню', it: 'Menu', es: 'Menú' },
});

const footer = defineSection({
  copyright: {
    en: '© All rights reserved',
    ru: '© Все права защищены',
    it: '© Tutti i diritti riservati',
    es: '© Todos los derechos reservados',
  },
});

const blog = defineSection({
  pageTitle: {
    en: 'Blog - Prometheus',
    ru: 'Блог - Prometheus',
    it: 'Blog - Prometheus',
    es: 'Blog - Prometheus',
  },
  heading: { en: 'Blog', ru: 'Блог', it: 'Blog', es: 'Blog' },
  allCategory: { en: 'All', ru: 'Все', it: 'Tutti', es: 'Todos' },
  readMore: { en: 'Read more', ru: 'Читать далее', it: 'Leggi di più', es: 'Leer más' },
});

const home = defineSection({
  pageTitle: {
    en: 'Prometheus - Modern Web Platform',
    ru: 'Prometheus - Современная веб-платформа',
    it: 'Prometheus - Piattaforma Web Moderna',
    es: 'Prometheus - Plataforma Web Moderna',
  },
  heroTitle: {
    en: 'Welcome to Prometheus',
    ru: 'Добро пожаловать в Prometheus',
    it: 'Benvenuti su Prometheus',
    es: 'Bienvenidos a Prometheus',
  },
  heroDescription: {
    en: 'A modern platform for sharing knowledge, ideas, and innovations. Built with cutting-edge web technologies to deliver the best experience.',
    ru: 'Современная платформа для обмена знаниями, идеями и инновациями. Построена с использованием передовых веб-технологий для лучшего опыта.',
    it: "Una piattaforma moderna per condividere conoscenze, idee e innovazioni. Costruita con tecnologie web all'avanguardia per offrire la migliore esperienza.",
    es: 'Una plataforma moderna para compartir conocimientos, ideas e innovaciones. Construida con tecnologías web de vanguardia para ofrecer la mejor experiencia.',
  },
  latestNews: {
    en: 'Latest News',
    ru: 'Последние новости',
    it: 'Ultime Notizie',
    es: 'Últimas Noticias',
  },
  viewAllPosts: {
    en: 'View all posts',
    ru: 'Все посты',
    it: 'Tutti gli articoli',
    es: 'Ver todos los artículos',
  },
});

const lookup =
  (lang: Language) =>
  (entry: Entry): string =>
    entry[lang];

export const t = (lang: Language) => {
  const resolve = lookup(lang);
  return {
    nav: (key: keyof typeof nav): string => resolve(nav[key]),
    footer: (key: keyof typeof footer): string => resolve(footer[key]),
    blog: (key: keyof typeof blog): string => resolve(blog[key]),
    home: (key: keyof typeof home): string => resolve(home[key]),
  };
};

export const getNavLinks = (lang: Language) => {
  const tr = t(lang);
  return [
    { href: `/${lang}`, label: tr.nav('home') },
    { href: `/${lang}/blog`, label: tr.nav('blog') },
    { href: `/${lang}/manifest`, label: tr.nav('manifest') },
  ];
};
