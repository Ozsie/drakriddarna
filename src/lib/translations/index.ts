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

// Campaigns may additionally define their own log message translations, so that
// campaign-specific items/events can add their own entries to the "logs" namespace
// without touching the shared logs.json files.
const campaignLogsEnModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../../campaigns/*/translations/logs.en.json');
const campaignLogsSvModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../../campaigns/*/translations/logs.sv.json');

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

const loadLogsWithCampaigns = async (
  baseLoader: () => Promise<{ default: Record<string, unknown> }>,
  campaignModules: Record<
    string,
    () => Promise<{ default: Record<string, unknown> }>
  >,
): Promise<Record<string, unknown>> => {
  const base = (await baseLoader()).default;
  const campaignLogs = await loadCampaignTranslations(campaignModules);
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(campaignLogs)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof merged[key] === 'object' &&
      merged[key] !== null
    ) {
      merged[key] = {
        ...(merged[key] as Record<string, unknown>),
        ...(value as Record<string, unknown>),
      };
    } else {
      merged[key] = value;
    }
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
      loader: async () =>
        loadLogsWithCampaigns(
          async () => (await import('./en/logs.json')).default,
          campaignLogsEnModules,
        ),
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
      loader: async () =>
        loadLogsWithCampaigns(
          async () => (await import('./sv/logs.json')).default,
          campaignLogsSvModules,
        ),
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
