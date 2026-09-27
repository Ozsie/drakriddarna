import i18n from 'sveltekit-i18n';
import type { Config } from 'sveltekit-i18n';
import lang from './lang.json';

// Dynamically discover translations for every campaign under src/campaigns/*/translations/{en,sv}.json
// so that additional, self-contained campaigns automatically have their translations included
// without touching this file.
const campaignEnModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../../campaigns/*/translations/en.json');
const campaignSvModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../../campaigns/*/translations/sv.json');

const loadCampaignTranslations = async (
  modules: Record<string, () => Promise<{ default: Record<string, unknown> }>>,
): Promise<Record<string, unknown>> => {
  const merged: Record<string, unknown> = {};
  for (const loader of Object.values(modules)) {
    const mod = await loader();
    Object.assign(merged, mod.default);
  }
  return merged;
};

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
      locale: 'en',
      key: 'campaign',
      loader: async () => loadCampaignTranslations(campaignEnModules),
    },
    {
      locale: 'en',
      key: 'items',
      loader: async () => (await import('./en/items.json')).default,
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
    {
      locale: 'sv',
      key: 'campaign',
      loader: async () => loadCampaignTranslations(campaignSvModules),
    },
    {
      locale: 'sv',
      key: 'items',
      loader: async () => (await import('./sv/items.json')).default,
    },
  ],
};

export const { t, loading, locales, locale, loadTranslations, setLocale } =
  new i18n(config);

loading.subscribe(($loading) => $loading);
