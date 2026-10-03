import type { Campaign } from '../types';
import { setCampaignDeckProvider } from '../interactables/InteractableLogic';

// Auto-discover every campaign under src/campaigns/*/campaign.ts so that
// additional, self-contained campaigns are automatically registered without
// touching this file.
const campaignModules = import.meta.glob<{ default: Campaign }>(
  './*/campaign.ts',
  { eager: true },
);

export const campaigns: Record<string, Campaign> = Object.values(
  campaignModules,
).reduce<Record<string, Campaign>>((registry, mod) => {
  const campaign = mod.default;
  registry[campaign.id] = campaign;
  return registry;
}, {});

export const DEFAULT_CAMPAIGN_ID = 'iceDragonTreasure';

export const getCampaign = (
  campaignId: string = DEFAULT_CAMPAIGN_ID,
): Campaign => {
  const campaign = campaigns[campaignId];
  if (!campaign) {
    throw new Error(`Unknown campaign: ${campaignId}`);
  }
  return campaign;
};

export const isKnownCampaign = (campaignId: string): boolean =>
  campaignId in campaigns;

setCampaignDeckProvider(
  (campaignId: string) => getCampaign(campaignId).eventDeck,
);
