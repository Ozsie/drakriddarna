import i18n from 'sveltekit-i18n';
import lang from './lang.json';

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  translations: {
    en: { lang },
    cs: { lang },
  },
  loaders: [
    {
      locale: 'en',
      key: 'content',
      loader: async () => (await import('./en/content.json')).default,
    },
    {
      locale: 'sv',
      key: 'content',
      loader: async () => (await import('./sv/content.json')).default,
    },
  ],
};

export const { t, loading, locales, locale, loadTranslations, setLocale } =
  new i18n(config);

loading.subscribe(($loading) => $loading);
