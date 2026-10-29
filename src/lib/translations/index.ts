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

// Game masters also have self-contained translations discovered dynamically
const gameMasterEnModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../../gameMasters/*/translations/en.json');
const gameMasterSvModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../../gameMasters/*/translations/sv.json');

// Campaigns may additionally define their own log message translations, so that
// campaign-specific items/events can add their own entries to the "logs" namespace
// without touching the shared logs.json files.
const campaignLogsEnModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../../campaigns/*/translations/logs.en.json');
const campaignLogsSvModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../../campaigns/*/translations/logs.sv.json');

export const isObject = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && item !== null && !Array.isArray(item);

export const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

const loadCampaignTranslations = async (
  modules: Record<string, () => Promise<{ default: Record<string, unknown> }>>,
): Promise<Record<string, unknown>> => {
  let merged: Record<string, unknown> = {};
  for (const loader of Object.values(modules)) {
    const mod = await loader();
    merged = deepMerge(merged, mod.default);
  }
  return merged;
};

const loadContentWithGameMasters = async (
  baseLoader: () => Promise<Record<string, unknown>>,
  gmModules: Record<
    string,
    () => Promise<{ default: Record<string, unknown> }>
  >,
): Promise<Record<string, unknown>> => {
  const base = await baseLoader();
  const gmTranslations = await loadCampaignTranslations(gmModules);
  return deepMerge(base, gmTranslations);
};

const loadLogsWithCampaigns = async (
  baseLoader: () => Promise<Record<string, unknown>>,
  campaignModules: Record<
    string,
    () => Promise<{ default: Record<string, unknown> }>
  >,
): Promise<Record<string, unknown>> => {
  const base = await baseLoader();
  const campaignLogs = await loadCampaignTranslations(campaignModules);
  return deepMerge(base, campaignLogs);
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
      loader: async () =>
        loadContentWithGameMasters(
          async () => (await import('./en/content.json')).default,
          gameMasterEnModules,
        ),
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
      locale: 'en',
      key: 'monsters',
      loader: async () => (await import('./en/monsters.json')).default,
    },
    {
      locale: 'sv',
      key: 'content',
      loader: async () =>
        loadContentWithGameMasters(
          async () => (await import('./sv/content.json')).default,
          gameMasterSvModules,
        ),
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
    {
      locale: 'sv',
      key: 'monsters',
      loader: async () => (await import('./sv/monsters.json')).default,
    },
  ],
};

export const { t, loading, locales, locale, loadTranslations, setLocale } =
  new i18n(config);

loading.subscribe(($loading) => $loading);
