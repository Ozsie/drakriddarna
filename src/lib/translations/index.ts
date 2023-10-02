import i18n from 'sveltekit-i18n';
import type { Config } from 'sveltekit-i18n';
import lang from './lang.json';

export const config: Config = {
  translations: {
    en: { lang },
    sv: { lang },
  },
  loaders: [
    {
      locale: 'en',
      key: 'content',
      loader: async () => (await import('./en/content.json')).default,
    },
    {
      locale: 'en',
      key: 'logs',
      loader: async () => (await import('./en/logs.json')).default,
    },
    {
      locale: 'en',
      key: 'events',
      loader: async () => (await import('./en/events.json')).default,
    },
    {
      locale: 'sv',
      key: 'content',
      loader: async () => (await import('./sv/content.json')).default,
    },
    {
      locale: 'sv',
      key: 'logs',
      loader: async () => (await import('./sv/logs.json')).default,
    },
    {
      locale: 'sv',
      key: 'events',
      loader: async () => (await import('./sv/events.json')).default,
    },
  ],
};

export const { t, loading, locales, locale, loadTranslations, setLocale } =
  new i18n(config);

loading.subscribe(($loading) => $loading);
