# Campaign definitions

This document is the reference for the `Campaign` type: what a campaign
bundle contains, how the pieces fit together, and which parts of the game
are shared versus campaign-owned. For the shape of an individual dungeon,
see [dungeon-definition.md](./dungeon-definition.md). For step-by-step
instructions and the optional extras (custom items, monsters, events,
interactables, lights, log messages, sprites), see
[src/campaigns/README.md](../src/campaigns/README.md).

## What a campaign is

A campaign is a **self-contained bundle of story content** — a chain of
dungeons, the playable heroes and its own translations — living in one
folder under `src/campaigns/<id>/`. Campaigns are registered by
auto-discovery: `src/campaigns/index.ts` globs every `./*/campaign.ts` via
Vite's `import.meta.glob` and indexes the campaigns by their `id`. Creating
the folder and entry file is enough — no core-code changes, no registration
list, no UI changes (the in-game "New Game" menu lists every campaign from
the registry).

```
src/campaigns/
  index.ts                     // auto-discovery registry, do not edit per campaign
  myNewCampaign/
    campaign.ts                // entry point, default-exports the Campaign object
    dungeons/*.ts              // Dungeon definitions, chained via nextDungeon
    items/ monsters/ events/   // optional campaign-specific content
    translations/
      en.json  sv.json         // campaign strings (name, dungeons, notes, ...)
      logs.en.json  logs.sv.json // optional extra log-message templates
```

## The `Campaign` type

Defined in `src/types.ts`; the entry file must have a **default export** of
this shape:

| Field                | Type                   | Description                                                                                                                                                                                                                                                                                                                               |
| :------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | `string` (required)    | Unique identifier; must match the folder name, since the registry indexes campaigns by `id` and saves store `campaignId`.                                                                                                                                                                                                                 |
| `name`               | `string` (required)    | Translation key of the campaign's display name (resolved via `$t`), e.g. `'campaign.myNewCampaign.name'`. Define the text under this exact key in the campaign's own `translations/{en,sv}.json`.                                                                                                                                         |
| `nameTranslationKey` | `string`               | Explicit translation key; falls back to `name` when omitted.                                                                                                                                                                                                                                                                              |
| `dungeons`           | `Dungeon[]` (required) | The campaign's dungeons. The first entry is the starting dungeon; the rest are chained by each dungeon's `nextDungeon` (see [dungeon-definition.md](./dungeon-definition.md)).                                                                                                                                                            |
| `heroes`             | `Actor[]` (required)   | The starting party. The simplest way is `newHero(name, colour)` from `src/hero/HeroLogic.ts`, which builds a fully-stated starting hero; build an `Actor` directly for custom stats or equipment. The hero selection screen (New Game flow) lets the player pick and rename 1–`maxHeroes` of them; the full roster is the candidate list. |
| `maxHeroes`          | `number`               | Maximum party size for the hero selection screen. Defaults to the campaign's own roster size (`heroes.length`) when omitted; the minimum is always 1.                                                                                                                                                                                     |
| `itemDeck`           | `Item[]` (required)    | The item deck: weapons/armours/shields the dungeon search results and floor items draw from. Built by repeating each item `amountInDeck` times (see below).                                                                                                                                                                               |
| `magicItemDeck`      | `Item[]` (required)    | The magic-item deck, built the same way.                                                                                                                                                                                                                                                                                                  |
| `eventDeck`          | `TurnEvent[]`          | Optional extra world events on top of the global ones (`src/events/events.ts` are always included). Events are filtered per dungeon by their `number` via `Dungeon.events`.                                                                                                                                                               |
| `tileset`            | `string`               | Campaign-wide tileset image override; a dungeon's own `tileset` wins (see [Tilesets](../src/campaigns/README.md#tilesets-optional)).                                                                                                                                                                                                      |

### Minimal entry point

```ts
import type { Campaign, Item } from '../../types';
import { weapons } from '../../items/weapons';
import { armours } from '../../items/armours';
import { shields } from '../../items/shields';
import { magicItems } from '../../items/magicItems';
import { Colour } from '../../types';
import { newHero } from '../../hero/HeroLogic';
import { e2m0 } from './dungeons/e2m0';

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
  name: 'campaign.myNewCampaign.name',
  dungeons: [e2m0 /* chained via nextDungeon */],
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

## Shared versus campaign-owned content

- **Global, shared by every campaign:** items, magic items, monsters,
  interactable effects and world events (`src/items/*`, `src/monsters/*`,
  `src/events/*`, `src/interactables/*`) — a campaign normally just imports
  these to build its decks and populate dungeons. Difficulty levels
  (`src/game.ts`) are also fully global; there is currently no per-campaign
  difficulty curve.
- **Campaign-owned:** dungeons, heroes and translations — these must never
  cross-reference another campaign's folders or translation keys.
- **Extensible from inside a campaign:** items, monsters, monster
  abilities, events, interactable effects and log messages all use
  open string-keyed registries, so a campaign can add brand-new behaviour
  in its own folder without editing any shared file — see the corresponding
  "Adding new …" sections in
  [src/campaigns/README.md](../src/campaigns/README.md).

## Translations

All user-facing strings are translation keys resolved with sveltekit-i18n in
both English and Swedish. Campaign strings live in
`translations/{en,sv}.json` under a unique namespace
(`campaign.<id>.*`), including the mandatory `campaign.<id>.name`. Extra
log-message templates live in optional `translations/logs.{en,sv}.json`,
merged into the shared `logs` namespace. All four file kinds are
auto-discovered by `src/lib/translations/index.ts` — no registration needed.

## Conventions

- `nextDungeon` chains and any other cross-references stay entirely within
  the campaign's own `dungeons/` folder — the type system does not enforce
  this, so double-check imports.
- Do not edit `src/campaigns/index.ts` to add a campaign; it auto-discovers
  every `./*/campaign.ts`.
- Prefer reusing the global items/monsters/events so balance stays
  consistent across campaigns; add campaign-specific ones only for genuinely
  new behaviour.
