# Campaigns

This directory contains all playable campaigns. Each campaign is a
**self-contained bundle of story content** (dungeons, heroes and its own
translations) that is automatically discovered and registered by
`src/campaigns/index.ts` — no core code needs to be touched to add a new
campaign.

Items, magic items, monsters and world events are **global** and shared by
every campaign (`src/items/*`, `src/monsters/*`, `src/events/*`). A campaign
normally just imports these shared modules to build its `itemDeck` /
`magicItemDeck`, but it can also define brand-new items with brand-new
behaviour that live entirely inside its own folder (see
[Adding new items](#adding-new-items-optional) below).

## Directory layout

Each campaign lives in its own folder, named after its `id`:

```
src/campaigns/
  index.ts                     // auto-discovery registry, do not edit per campaign
  README.md                    // this file
  iceDragonTreasure/
    campaign.ts                // entry point, exports the Campaign object (default export)
    dungeons/
      e1m0.ts, e1m1.ts, ...    // Dungeon definitions, chained via nextDungeon
      dungeons.test.ts
    heroes/                    // (if applicable) hero definitions specific to this campaign
    items/
      customMagicItems.ts      // optional: brand-new campaign-specific items
    translations/
      en.json
      sv.json
  myNewCampaign/
    campaign.ts
    dungeons/*.ts
    items/*.ts
    translations/en.json, sv.json
```

## Creating a new campaign

1. **Create the folder**: `src/campaigns/myNewCampaign/`.
2. **Add dungeons**: create `dungeons/*.ts` files, each exporting a
   `Dungeon` object (mirror the shape used in `iceDragonTreasure/dungeons/`).
   Chain them together via `nextDungeon`. Dungeons should only ever link to
   other dungeons within the same campaign.
3. **Add heroes**: reuse the shared hero templates, or define
   campaign-specific ones if the campaign needs its own roster.
4. **Create `campaign.ts`**, the campaign's entry point. It must have a
   **default export** of type `Campaign`:

   ```ts
   import type { Campaign, Item } from '../../types';
   import { weapons } from '../../items/weapons';
   import { armours } from '../../items/armours';
   import { shields } from '../../items/shields';
   import { magicItems } from '../../items/magicItems';
   import { heroes } from '../../hero/heroes'; // or your own heroes
   import { e2m0 } from './dungeons/e2m0';
   // ... import the rest of your dungeons

   const getItemDeck = (): Item[] => {
     const itemDeck: Item[] = [];
     [...weapons, ...armours, ...shields].forEach((item) => {
       for (let i = 0; i < item.amountInDeck; i++) itemDeck.push(item);
     });
     return itemDeck;
   };

   const getMagicItemDeck = (): Item[] => {
     const itemDeck: Item[] = [];
     magicItems.forEach((item) => {
       for (let i = 0; i < item.amountInDeck; i++) itemDeck.push(item);
     });
     return itemDeck;
   };

   const campaignMyNewCampaign: Campaign = {
     id: 'myNewCampaign',
     name: 'My New Campaign',
     dungeons: [e2m0 /* ... */],
     heroes,
     itemDeck: getItemDeck(),
     magicItemDeck: getMagicItemDeck(),
   };

   export default campaignMyNewCampaign;
   ```

   The registry in `src/campaigns/index.ts` auto-discovers every
   `./*/campaign.ts` file via `import.meta.glob` and indexes campaigns by
   their `id`, so simply creating this file is enough for the campaign to
   become selectable (e.g. via `init(campaignId)` in `game.ts`).

5. **Add translations**: create `translations/en.json` and
   `translations/sv.json`, namespaced under a unique key (e.g.
   `campaign.myNewCampaign.*`). These are automatically discovered and
   merged into the global `campaign` translation namespace by
   `src/lib/translations/index.ts` (via `import.meta.glob`) — no code
   changes needed there either.

## Adding new items (optional)

Items already support a string-keyed effect/reset/pickup/drop pattern
(`src/items/ItemLogic.ts`), so a campaign can introduce brand-new item
behaviour without editing any shared file:

1. Create `items/customItems.ts` (or `customMagicItems.ts`) inside your
   campaign folder.
2. Define the item data with a unique `effect` / `reset` (and optionally
   `pickup` / `drop`) string key.
3. Call `registerItemEffect`, `registerItemReset`, `registerItemPickup`
   and/or `registerItemDrop` (exported from `src/items/ItemLogic.ts`) once
   at module load to register the handler function(s) for those keys.
4. Import the resulting item array from your `campaign.ts` and merge it into
   `itemDeck` / `magicItemDeck`.

Follow this pattern inside your own campaign's `items/` folder to add
brand-new item behaviour without touching any shared file.

## Rules of thumb

- Keep story content (dungeons, heroes) and campaign-specific translations
  inside the campaign's own folder — never reference another campaign's
  dungeons or translation keys.
- Prefer reusing the global `items/`, `monsters/` and `events/` modules so
  balance stays consistent across campaigns; only add campaign-specific
  items when you need genuinely new behaviour.
- `nextDungeon` chains, and any other cross-references, must stay entirely
  within the campaign's own `dungeons/` folder.
- Do not edit `src/campaigns/index.ts` to add a campaign — it auto-discovers
  every `./*/campaign.ts` file.
