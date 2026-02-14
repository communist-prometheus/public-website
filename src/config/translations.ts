import type { Language } from './i18n';

type Entry = Readonly<Record<Language, string>>;

const defineSection = <T extends Readonly<Record<string, Entry>>>(section: T): T => section;

const nav = defineSection({
  home: { en: 'Home', ru: 'Главная' },
  blog: { en: 'Blog', ru: 'Блог' },
  positions: { en: 'Positions', ru: 'Позиции' },
  manifest: { en: 'Manifest', ru: 'Манифест' },
  menu: { en: 'Menu', ru: 'Меню' },
});

const footer = defineSection({
  copyright: { en: '© All rights reserved', ru: '© Все права защищены' },
});

const blog = defineSection({
  pageTitle: { en: 'Blog - Prometheus', ru: 'Блог - Prometheus' },
  heading: { en: 'Blog', ru: 'Блог' },
  allCategory: { en: 'All', ru: 'Все' },
  readMore: { en: 'Read more', ru: 'Читать далее' },
});

const home = defineSection({
  pageTitle: {
    en: 'Prometheus - Modern Web Platform',
    ru: 'Prometheus - Современная веб-платформа',
  },
  heroTitle: { en: 'Welcome to Prometheus', ru: 'Добро пожаловать в Prometheus' },
  heroDescription: {
    en: 'A modern platform for sharing knowledge, ideas, and innovations. Built with cutting-edge web technologies to deliver the best experience.',
    ru: 'Современная платформа для обмена знаниями, идеями и инновациями. Построена с использованием передовых веб-технологий для лучшего опыта.',
  },
  latestNews: { en: 'Latest News', ru: 'Последние новости' },
  viewAllPosts: { en: 'View all posts', ru: 'Все посты' },
});

const positions = defineSection({
  pageTitle: { en: 'Positions - Prometheus', ru: 'Позиции - Prometheus' },
  heading: { en: 'Positions', ru: 'Позиции' },
  viewAll: { en: 'View all positions', ru: 'Все позиции' },
  readMore: { en: 'Read more', ru: 'Подробнее' },
  backToList: { en: '← Back to positions', ru: '← Назад к позициям' },
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
    positions: (key: keyof typeof positions): string => resolve(positions[key]),
  };
};

export const getNavLinks = (lang: Language) => {
  const tr = t(lang);
  return [
    { href: `/${lang}`, label: tr.nav('home') },
    { href: `/${lang}/blog`, label: tr.nav('blog') },
    { href: `/${lang}/positions`, label: tr.nav('positions') },
    { href: `/${lang}/manifest`, label: tr.nav('manifest') },
  ];
};
