# Campaigns

This directory contains all playable campaigns. Each campaign is a
**self-contained bundle of story content** (dungeons, heroes and its own
translations) that is automatically discovered and registered by
`src/campaigns/index.ts` — no core code needs to be touched to add a new
campaign.

Items, magic items, monsters and world events are **global** and shared by
every campaign (`src/items/*`, `src/monsters/*`, `src/events/*`). A campaign
normally just imports these shared modules to build its `itemDeck` /
`magicItemDeck` and places the built-in monster types in its dungeons, but it
can also define brand-new items, monsters and events with brand-new
behaviour that live entirely inside its own folder (see
[Adding new items](#adding-new-items-optional),
[Adding new monsters](#adding-new-monsters-optional) and
[Adding new events](#adding-new-events-optional) below).

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
    translations/
      en.json
      sv.json
  myNewCampaign/
    campaign.ts
    dungeons/*.ts
    items/*.ts
    monsters/*.ts
    events/*.ts
    translations/
      en.json
      sv.json
      logs.en.json
      logs.sv.json
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

### Example: `items/customMagicItems.ts`

```ts
import type { Item } from '../../../types';
import { ItemType } from '../../../types';
import { registerItemEffect, registerItemReset } from '../../../items/ItemLogic';
import { addLog, i18n } from '../../../core';

const AMULET_OF_WARDING = 'amuletOfWarding';

export const customMagicItems: Item[] = [
  {
    id: 'amulet_of_warding',
    name: 'campaign.myNewCampaign.items.amuletOfWarding.name',
    nameTranslationKey: 'campaign.myNewCampaign.items.amuletOfWarding.name',
    description:
      'campaign.myNewCampaign.items.amuletOfWarding.description',
    descriptionTranslationKey:
      'campaign.myNewCampaign.items.amuletOfWarding.description',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    effect: AMULET_OF_WARDING,
    reset: AMULET_OF_WARDING,
  },
];

registerItemEffect(AMULET_OF_WARDING, (state, self, user) => {
  user.defense += 1;
  addLog(state, 'logs.item.amuletOfWarding', {
    user: i18n(user.name),
    item: i18n(self.name),
  });
});

registerItemReset(AMULET_OF_WARDING, (_state, self) => {
  self.disabled = false;
});
```

The `logs.item.amuletOfWarding` key used above is a **campaign-defined log
translation** — see [Adding new log messages](#adding-new-log-messages-optional)
below for how to define it.

Then merge `customMagicItems` into `magicItemDeck` inside `campaign.ts`:

```ts
import { customMagicItems } from './items/customMagicItems';

const getMagicItemDeck = (): Item[] => {
  const itemDeck: Item[] = [];
  [...magicItems, ...customMagicItems].forEach((item) => {
    for (let i = 0; i < item.amountInDeck; i++) itemDeck.push(item);
  });
  return itemDeck;
};
```

## Adding new events (optional)

World events follow the same string-keyed `effect` pattern as items
(`src/events/EventsLogic.ts`), so a campaign can introduce brand-new events
with brand-new behaviour without editing any shared file:

1. Create `events/customEvents.ts` inside your campaign folder, exporting a
   `TurnEvent[]` array. Each event needs a unique `id`, a `number` (used for
   per-dungeon event filtering via `Dungeon.events`) and a unique `effect`
   string key. `name`/`description` should reference translation keys living
   in your campaign's own `translations/{en,sv}.json`.
2. Call `registerEventEffect(key, handler)` (exported from
   `src/events/EventsLogic.ts`) once at module load, for each custom
   `effect` key, to register the handler function `(state, event) => void`
   that implements the event's behaviour.
3. Set the resulting array as `eventDeck` on your `campaign.ts`'s `Campaign`
   object (see the full example below).

   `Campaign.eventDeck` is optional and purely additive — the global events
   in `src/events/events.ts` are always included; `eventDeck` only lets a
   campaign add extra events on top of them for its own dungeons.

### Example: `events/customEvents.ts`

```ts
import type { TurnEvent } from '../../../types';
import { registerEventEffect } from '../../../events/EventsLogic';
import { addLog } from '../../../core';

const FROZEN_MIST = 'frozenMist';

export const customEvents: TurnEvent[] = [
  {
    id: 'frozen_mist',
    number: 101,
    name: 'campaign.myNewCampaign.events.frozenMist.name',
    nameTranslationKey: 'campaign.myNewCampaign.events.frozenMist.name',
    description: 'campaign.myNewCampaign.events.frozenMist.description',
    descriptionTranslationKey:
      'campaign.myNewCampaign.events.frozenMist.description',
    effect: FROZEN_MIST,
    used: false,
  },
];

registerEventEffect(FROZEN_MIST, (state, event) => {
  addLog(state, event.description);
  addLog(state, event.name);
  state.heroes.forEach((hero) => {
    hero.movement = Math.max(0, hero.movement - 1);
  });
  event.used = true;
});
```

Then set it as `eventDeck` on your `campaign.ts`'s `Campaign` object:

```ts
import { customEvents } from './events/customEvents';

const campaignMyNewCampaign: Campaign = {
  id: 'myNewCampaign',
  // ...
  eventDeck: customEvents,
};
```

## Adding new monsters (optional)

Monster stats and special abilities are also driven by a string-keyed
registry (`src/monsters/MonsterRegistry.ts`), the same pattern used for
items and events, so a campaign can introduce brand-new monster types
(new stats and/or new special abilities) without editing any shared file.
`MonsterType` is not a closed enum — it accepts any string, so a campaign
can invent its own type identifiers freely.

1. Create `monsters/customMonsters.ts` inside your campaign folder and pick
   a unique type identifier string for each new monster type.
2. Call `registerMonsterTemplate(type, overrides)` (exported from
   `src/monsters/MonsterRegistry.ts`) once at module load, for each new
   type, to define its stats (`level`, `actions`, `defense`, `health`,
   `maxHealth`, `experience`, `weapon`, `armour`, `rangedWeapon`, `shield`).
   Any field left out falls back to the default "master" stat block used by
   `createMonster` (`src/dungeon/DungeonLogic.ts`).
3. Optionally call `registerMonsterAbility(type, ability)` for each of
   `'diagonalFireAttack'`, `'orthogonalFireAttack'`, `'sameRoomFireAttack'`
   to give the new type one of the existing "dark lord" special attacks
   (`src/monsters/MonsterLogic.ts`). A type with any of these abilities is
   treated as a dark lord (excluded from the "regular monster" diagonal /
   orthogonal / same-room target lists, matching the built-in dark lords).
4. Or, define a **brand-new ability** with entirely new behaviour (see
   [Adding new monster abilities](#adding-new-monster-abilities-optional)
   below) instead of reusing one of the 3 built-in fire attacks.
5. Use `createMonster(type, colour, x, y)` (or
   `createMonsterWithInventory`) with your new type identifier when placing
   monsters in your campaign's own `dungeons/*.ts` files — exactly like the
   built-in `MonsterType.ORC`/`MonsterType.TROLL`/etc.

### Example: `monsters/customMonsters.ts`

```ts
import { Level } from '../../../types';
import {
  registerMonsterAbility,
  registerMonsterTemplate,
} from '../../../monsters/MonsterRegistry';
import { monsterWeapons } from '../../../items/weapons';

export const FROST_LORD = 'Frost Lord';

registerMonsterTemplate(FROST_LORD, {
  level: Level.LORD,
  actions: 2,
  defense: 2,
  health: 5,
  maxHealth: 5,
  experience: 5,
  weapon: monsterWeapons[4],
});

// Gains the same "attack any hero in the same room" special ability as the
// built-in Green/Blue Dark Lords.
registerMonsterAbility(FROST_LORD, 'sameRoomFireAttack');
```

Then reference `FROST_LORD` from your campaign's own dungeon layouts, the
same way `MonsterType.GREEN_DARK_LORD` etc. are used in
`iceDragonTreasure/dungeons/e1m6.ts`:

```ts
import { createMonster } from '../../../dungeon/DungeonLogic';
import { Colour } from '../../../types';
import { FROST_LORD } from '../monsters/customMonsters';

createMonster(FROST_LORD, Colour.Blue, 5, 8);
```

## Adding new monster abilities (optional)

The 3 built-in special attacks (`diagonalFireAttack`, `orthogonalFireAttack`,
`sameRoomFireAttack`) are not the only abilities a monster can have. A
campaign can define a genuinely new ability — with completely custom
behaviour (self-heal, poison, summon, etc.) — by registering a handler
function, without editing `MonsterLogic.ts` or any other shared file.

1. Pick a unique ability key string (anything other than the 3 built-in
   keys above).
2. Call `registerMonsterAbilityHandler(ability, handler)` (exported from
   `src/monsters/MonsterRegistry.ts`) once at module load. The handler has
   the signature `(state, monster) => boolean | Promise<boolean>` and is
   invoked once per monster action, before the default melee/ranged/move
   selection. Return `true` if the handler performed an action (and
   **decrement `monster.actions` yourself**, exactly like the built-in
   attack functions in `MonsterLogic.ts` do); return `false`/`undefined`
   to fall back to the monster's normal behaviour for that turn.
3. Call `registerMonsterAbility(type, ability)` to attach the new ability
   key to one or more monster types (built-in or campaign-defined).

### Example: `monsters/customAbilities.ts`

```ts
import type { GameState, Monster } from '../../../types';
import {
  registerMonsterAbility,
  registerMonsterAbilityHandler,
} from '../../../monsters/MonsterRegistry';
import { addLog, i18n } from '../../../core';
import { liveHeroes } from '../../../hero/HeroLogic';

export const POISON_CLOUD = 'poisonCloud';

registerMonsterAbilityHandler(
  POISON_CLOUD,
  (state: GameState, monster: Monster): boolean => {
    // Only trigger once every couple of turns, otherwise let the monster
    // act normally.
    if (Math.random() > 0.3) return false;

    liveHeroes(state).forEach((hero) => {
      hero.health = Math.max(0, hero.health - 1);
    });
    addLog(state, 'logs.monster.poisonCloud', { monster: i18n(monster.name) });
    monster.actions--;
    return true;
  },
);

// Attach the new ability to a campaign-defined (or built-in) monster type.
registerMonsterAbility('Bog Troll', POISON_CLOUD);
```

Remember to add the `logs.monster.poisonCloud` message key to your campaign's
own `translations/logs.en.json`/`logs.sv.json` (see
[Adding new log messages](#adding-new-log-messages-optional) below).

## Adding new log messages (optional)

The action log (`addLog(state, key, params)`) reads its message templates from
the global `logs` translation namespace (`src/lib/translations/{en,sv}/logs.json`).
Since campaign-defined items and events (see above) can trigger arbitrary
`addLog` keys, a campaign needs a way to add its own log message templates
without editing those shared files.

This works exactly like the campaign `translations/{en,sv}.json` files, but
for the `logs` namespace: create optional `translations/logs.en.json` and
`translations/logs.sv.json` files inside your campaign folder. They are
automatically discovered (via `import.meta.glob`) and deep-merged into the
global `logs` namespace by `src/lib/translations/index.ts` — no code changes
needed.

Mirror the shape of the shared `logs.json` files (e.g. nest your custom item
messages under `item.*`, and custom event messages under `events.*`) so that
`addLog(state, 'logs.item.amuletOfWarding', ...)` /
`addLog(state, 'logs.events.frozenMist', ...)` resolve correctly, and pick
unique keys that won't collide with the shared ones or another campaign's.

### Example: `translations/logs.en.json`

```json
{
  "item": {
    "amuletOfWarding": "{{user}} used {{item}}, gaining +1 defense."
  },
  "events": {
    "frozenMist": "A frozen mist slows the heroes down."
  }
}
```

### Example: `translations/logs.sv.json`

```json
{
  "item": {
    "amuletOfWarding": "{{user}} använde {{item}} och fick +1 försvar."
  },
  "events": {
    "frozenMist": "En frusen dimma saktar ner hjältarna."
  }
}
```

## Rules of thumb

- Keep story content (dungeons, heroes) and campaign-specific translations
  inside the campaign's own folder — never reference another campaign's
  dungeons or translation keys.
- Prefer reusing the global `items/`, `monsters/` and `events/` modules so
  balance stays consistent across campaigns; only add campaign-specific
  items/monsters/events when you need genuinely new behaviour.
- `nextDungeon` chains, and any other cross-references, must stay entirely
  within the campaign's own `dungeons/` folder.
- Do not edit `src/campaigns/index.ts` to add a campaign — it auto-discovers
  every `./*/campaign.ts` file.
