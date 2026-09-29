# Campaigns

This directory contains all playable campaigns. Each campaign is a
**self-contained bundle of story content** (dungeons, heroes and its own
translations) that is automatically discovered and registered by
`src/campaigns/index.ts` — no core code needs to be touched to add a new
campaign.

Items, magic items, monsters, interactables and world events are **global** and shared by
every campaign (`src/items/*`, `src/monsters/*`, `src/events/*`, `src/interactables/*`). A campaign
normally just imports these shared modules to build its `itemDeck` /
`magicItemDeck` and places the built-in monster types in its dungeons, but it
can also define brand-new items, monsters, events and interactable effects with brand-new
behaviour that live entirely inside its own folder (see
[Adding new items](#adding-new-items-optional),
[Adding new monsters](#adding-new-monsters-optional),
[Adding new events](#adding-new-events-optional) and
[Adding interactable cells](#adding-interactable-cells-optional) below).

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
   `Dungeon` object (see `src/types.ts` for the full type; mirror the shape
   used in `iceDragonTreasure/dungeons/`). The most important fields are:
   - `layout: Layout` — `grid` (the room/corridor ASCII layout), `doors`,
     `monsters` (placed via `createMonster`, see
     [Adding new monsters](#adding-new-monsters-optional)), `secrets`,
     `notes`, `items` (placed via `ItemLocation`), `interactables` (placed
     via `defineLayout` or `parseTileMap`, see
     [Adding interactable cells](#adding-interactable-cells-optional)),
     `corridors`, `corners`.
   - `startingPositions` — where heroes are placed when entering.
   - `winConditions: WinCondition[]` — one or more `ConditionType`s (e.g.
     `KILL_ALL`, `REACH_CELL`, `SECRET_FOUND`) that must be `fulfilled` to
     beat the dungeon.
   - `events?: number[]` — restricts which global/campaign event `number`s
     can be drawn while inside this dungeon.
   - `nextDungeon?: Dungeon` — chains to the next dungeon once beaten.
     Dungeons should only ever link to other dungeons within the same
     campaign — this is a convention, **not enforced by the type system**,
     so double-check you never accidentally import and link to another
     campaign's dungeon.
3. **Add heroes**: reuse the shared hero templates, or define
   campaign-specific ones if the campaign needs its own roster. The
   simplest way is `newHero(name, colour)` (exported from
   `src/hero/HeroLogic.ts`), which builds a fully-stated starting `Hero`
   (`Actor` + `isInventoryOpen`) with default level/stats/weapon:

   ```ts
   import { Colour } from '../../types';
   import { newHero } from '../../hero/HeroLogic';

   const heroes = [
     newHero('Fearik', Colour.Yellow),
     newHero('Helbran', Colour.Red),
     newHero('Siedel', Colour.Green),
     newHero('Wulf', Colour.Blue),
   ];
   ```

   To fully customize a hero (starting weapon/armour/inventory/stats),
   build an `Actor` object directly instead — see the `Actor` type in
   `src/types.ts` for all available fields.
4. **Create `campaign.ts`**, the campaign's entry point. It must have a
   **default export** of type `Campaign`:

   ```ts
   import type { Campaign, Item } from '../../types';
   import { weapons } from '../../items/weapons';
   import { armours } from '../../items/armours';
   import { shields } from '../../items/shields';
   import { magicItems } from '../../items/magicItems';
   import { Colour } from '../../types';
   import { newHero } from '../../hero/HeroLogic'; // or build your own Actor[]
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
     // `name` must be a translation key, not a plain string — it is passed
     // through `$t(...)` wherever campaigns are listed (e.g. the in-game
     // "New Game" campaign-select menu, see below). Define the actual text
     // under this exact key in your own translations/{en,sv}.json.
     name: 'campaign.myNewCampaign.name',
     dungeons: [e2m0 /* ... */],
     heroes: [
       newHero('Fearik', Colour.Yellow),
       newHero('Helbran', Colour.Red),
       newHero('Siedel', Colour.Green),
       newHero('Wulf', Colour.Blue),
     ],
     itemDeck: getItemDeck(),
     magicItemDeck: getMagicItemDeck(),
   };

   export default campaignMyNewCampaign;
   ```

   The registry in `src/campaigns/index.ts` auto-discovers every
   `./*/campaign.ts` file via `import.meta.glob` and indexes campaigns by
   their `id`, so simply creating this file is enough for the campaign to
   become selectable — both programmatically (`init(campaignId)` in
   `game.ts`) and directly by players: the in-game "New Game" menu
   (`src/components/ButtonPad.svelte`) lists every campaign from the
   registry by its translated `name` and calls `init(campaign.id)` when
   selected, so no UI changes are needed either.

5. **Add translations**: create `translations/en.json` and
   `translations/sv.json`, namespaced under a unique key (e.g.
   `campaign.myNewCampaign.*`), and make sure to include the `name` key
   used in `campaign.ts` (e.g. `campaign.myNewCampaign.name`). These are
   automatically discovered and merged into the global `campaign`
   translation namespace by `src/lib/translations/index.ts` (via
   `import.meta.glob`) — no code changes needed there either.

**Note on difficulty:** difficulty levels (`src/game.ts`'s `DifficultLevels`)
are fully global and shared by every campaign — there is currently no
`difficulties` field on `Campaign` to override them per campaign. If your
campaign needs a different difficulty curve, that would require a small
engine change first; it is not something you can configure from within your
campaign folder today.

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

## Adding interactable cells (optional)

Dungeon layouts can include **interactable cells** (`InteractableCell`) that
trigger custom or built-in effects when heroes interact with them (via the radial
menu when standing on the tile) or step on them. Like items, monsters and
events, interactable effects use an open string-keyed registry
(`src/interactables/InteractableLogic.ts`), allowing campaigns to introduce
unique dungeon mechanics without editing shared engine code.

### 1. Built-in effect handlers

The engine includes built-in interactable effect handlers:

- `'addHero'`: Recruits an ally into the player's party. Supports `args`:
  - `name` / `heroName`: name of the hero (defaults to `'Allied Hero'`).
  - `colour` / `color`: `Colour` enum value (defaults to `Colour.Yellow`).
  - `hero`: optional full `Hero` object if custom stats or equipment are needed.
  - `position`: optional spawn position (defaults to the interactable's position).
- `'removeTrapsInRoom'`: Disarms trapped doors and reveals/disarms hidden trap doors
  within the interactable's room (or the room specified in `args.room`).

### 2. Placing interactable cells in a dungeon

Interactables can be defined in dungeon files using either `defineLayout`
(object or tuple shorthand) or `parseTileMap`:

#### Using `defineLayout` (tuple or object format)

```ts
import { defineLayout } from '../../../dungeon/dungeonParser';
import { Colour } from '../../../types';

export const myDungeonLayout = defineLayout({
  grid: [
    'AAAA',
    'AAAA',
    'AAAA',
  ],
  doors: [/* ... */],
  interactables: [
    // Tuple shorthand: [x, y, effect]
    [1, 1, 'removeTrapsInRoom'],

    // Tuple with options/arguments: [x, y, effect, options]
    [
      2,
      1,
      'addHero',
      {
        name: 'Fearik',
        colour: Colour.Yellow,
        oneTime: true,
      },
    ],

    // Object format
    {
      x: 3,
      y: 1,
      effect: 'leverSecretDoor',
      id: 'secret_lever_1',
      name: 'campaign.myNewCampaign.interactables.lever.name',
      description: 'campaign.myNewCampaign.interactables.lever.description',
      oneTime: true,
      triggerOn: 'interact', // 'interact' | 'step' | 'both'
      args: { targetSecretId: 'hidden_door_1' },
    },
  ],
});
```

#### Using `parseTileMap`

```ts
import { parseTileMap } from '../../../dungeon/dungeonParser';
import { Colour } from '../../../types';

const tileMap = parseTileMap(
  [
    '######',
    '#..L.#',
    '#..H.#',
    '######',
  ],
  {
    '#': { room: 'A' },
    '.': { room: 'A' },
    'L': {
      room: 'A',
      interactable: {
        effect: 'removeTrapsInRoom',
        name: 'Trap Disarm Lever',
        oneTime: true,
      },
    },
    'H': {
      room: 'A',
      interactable: {
        effect: 'addHero',
        args: { name: 'Siedel', colour: Colour.Green },
        oneTime: true,
      },
    },
  },
);
```

### 3. Creating custom interactable effects

To introduce a new interactable effect:

1. Pick a unique string key for the effect.
2. Call `registerInteractableEffect(name, handler)` (exported from
   `src/interactables/InteractableLogic.ts`) at module load.
3. The handler function receives `(state: GameState, interactable: InteractableCell, actor?: Actor | Hero)`
   and can modify state, trigger secrets, unlock doors, award items, or write to the action log.

#### Example: `interactables/customInteractables.ts`

```ts
import type { Actor, GameState, Hero, InteractableCell } from '../../../types';
import { registerInteractableEffect } from '../../../interactables/InteractableLogic';
import { addLog, i18n } from '../../../core';

export const HEALING_FOUNTAIN = 'healingFountain';

registerInteractableEffect(
  HEALING_FOUNTAIN,
  (state: GameState, interactable: InteractableCell, actor?: Actor | Hero) => {
    if (actor) {
      actor.health = actor.maxHealth;
      addLog(state, 'logs.interactable.healingFountain', {
        hero: i18n(actor.name),
      });
    }
    return true;
  },
);
```

### Interactable properties reference

| Property | Type | Description |
| :--- | :--- | :--- |
| `position` / `x, y` | `Position` or numbers | Coordinate of the interactable cell on the dungeon grid. |
| `effect` | `string` | Key identifying the registered effect handler to execute. |
| `id` | `string` (optional) | Optional unique identifier for referencing the interactable. |
| `name` / `nameTranslationKey` | `string` (optional) | Name or translation key for UI and logs. |
| `description` / `descriptionTranslationKey` | `string` (optional) | Description or translation key for inspect/logs. |
| `oneTime` | `boolean` (default: `true`) | When `true`, cannot be activated again once triggered. |
| `triggerOn` | `'interact' \| 'step' \| 'both'` (default: `'interact'`) | When to trigger: player radial menu action (`'interact'`), walking onto tile (`'step'`), or either (`'both'`). |
| `args` | `Record<string, unknown>` (optional) | Custom arguments passed to the effect handler. |
| `icon` | `string` (optional) | Optional icon indicator identifier for rendering. |

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
