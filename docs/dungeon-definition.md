# Dungeon definitions

This document is the reference for how a single dungeon ("scenario") is
defined: the authoring DSL, every field and its meaning, and the structural
rules the parser enforces. For the surrounding campaign bundle (heroes, item
decks, translations, auto-discovery), see
[campaign-definition.md](./campaign-definition.md) and
[src/campaigns/README.md](../src/campaigns/README.md).

Dungeons are authored in plain TypeScript with helper functions from
`src/dungeon/dungeonParser.ts`. The authoring surface is the
`DeclarativeDungeon` type; `defineDungeon(...)` turns it into the runtime
`Dungeon` type (`src/types.ts`), applying defaults, normalizing tuple
shorthands and running structural validation
(`src/dungeon/dungeonValidator.ts`).

```ts
import type { Dungeon } from '../../types';
import {
  CellAlignment,
  Colour,
  ConditionType,
  MonsterType,
  Side,
} from '../../types';
import { defineDungeon } from '../../dungeon/dungeonParser';
import { brazier, chandelier } from '../../dungeon/LightSources';
import { e1m1 } from './e1m1';

export const e1m0: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m0.name',
  intro: 'campaign.iceDragon.e1m0.intro',
  winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
  nextDungeon: e1m1,
  startingPositions: [
    [2, 9],
    [1, 8],
    [1, 9],
    [1, 10],
  ],
  discoveredRooms: ['A'],
  ambientLight: 0.2,
  layout: {
    grid: [
      '     ######',
      '     #CCCC#',
      '     #CCCC#',
      '     #CCCC#',
      '     ##E###',
      '      #E#  ',
      '      #E## ',
      '##### #BB# ',
      '#AAA###BB# ',
      '#AAADDDBB# ',
      '#AAA###BB# ',
      '##### #### ',
    ],
    lights: [
      [2, 9, CellAlignment.CEILING, chandelier],
      [8, 10, CellAlignment.BOTTOM_RIGHT, brazier],
    ],
    doors: [
      [Side.RIGHT, 3, 9],
      [Side.UP, 7, 7],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Green, 6, 9],
      [MonsterType.TROLL, Colour.Green, 6, 1],
    ],
    corridors: ['D', 'E'],
    notes: [[2, 9, 'campaign.iceDragon.e1m0.notes.tutorial1']],
  },
  events: [1, 2, 3, 4, 5, 6],
});
```

Real examples live in `src/campaigns/iceDragonTreasure/dungeons/` and
`src/campaigns/earthHour/dungeons/`.

## Dungeon-level fields (`DeclarativeDungeon`)

| Field                 | Type                              | Default      | Description                                                                                                                                                                                                |
| :-------------------- | :-------------------------------- | :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                | `string` (required)               | —            | Translation key of the dungeon's display name (resolved via `$t`). Also used as `nameTranslationKey` when that is omitted.                                                                                 |
| `intro`               | `string` (required)               | —            | Translation key of the intro text shown when the dungeon starts.                                                                                                                                           |
| `winConditions`       | `WinCondition[]` (required)       | —            | One or more conditions; the dungeon is beaten once all are fulfilled (see [Win conditions](#win-conditions)).                                                                                              |
| `layout`              | `DeclarativeLayout` (required)    | —            | The grid and everything placed in it (see [Layout](#layout-definelayout)).                                                                                                                                 |
| `startingPositions`   | `Position \| [x, y][]` (required) | —            | Cells where heroes enter the dungeon; entries may be `[x, y]` tuples or `{x, y}` objects.                                                                                                                  |
| `discoveredRooms`     | `string[]`                        | `['A']`      | Grid letters already visible at the start (fog of war).                                                                                                                                                    |
| `nextDungeon`         | `Dungeon`                         | —            | The next dungeon in the campaign chain, loaded once this one is beaten. Chain only within your own campaign — this is a convention, **not enforced by the type system**.                                   |
| `events`              | `number[]`                        | all          | Restricts which global/campaign event `number`s can be drawn while inside this dungeon (event deck filtering in `src/events/EventsLogic.ts`).                                                              |
| `ambientLight`        | `number`                          | `1`          | Base light level of the whole dungeon: `1` fully lit, `0` pitch black; values clamped to `0`–`1`. Below `1` the scene is veiled in darkness and each light source punches a hole in it.                    |
| `collapsedCorridor`   | `string`                          | —            | Grid letter of a corridor that starts out collapsed (blocked); converted to a `collapsedCorridors` restore group covering all cells of that letter, which the landslide event can restore.                 |
| `onRoomDiscovered`    | `Record<string, string>`          | —            | Maps a grid letter to a registered room-effect key, fired when heroes discover that room. Built-in effects live in `roomEffects` (`src/dungeon/RoomEffectsLogic.ts`), e.g. `'revealRemainingItemsInRoom'`. |
| `music`               | `string`                          | —            | URL of the explore music track for this dungeon.                                                                                                                                                           |
| `tileset`             | `string`                          | —            | Per-dungeon tileset override (see [Tilesets](../src/campaigns/README.md#tilesets-optional)).                                                                                                               |
| `beaten`, `killCount` | `boolean`, `number`               | `false`, `0` | Runtime progress state; leave them out of the definition.                                                                                                                                                  |

Two further fields exist on the runtime `Dungeon` type but are **not yet
exposed by `defineDungeon`** and would have to be set afterwards:
`musicTension` (the alternative track played when monsters are near) and
`portal` (the hexagram portal position, normally created by an event).

## Grid

The `grid` is an array of equal-length strings, one character per cell:

| Character     | Meaning                                                                                                                                                                                                                                      |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `A`–`Z`       | A floor cell belonging to the room or corridor with that letter. All cells sharing a letter form one room: a letter is discovered (revealed from fog of war) as a whole when a hero sees or enters any of its cells or opens a door into it. |
| `#`           | Solid rock/wall cell. Impassable and blocks sight.                                                                                                                                                                                           |
| `?`           | A collapsed corridor cell (`COLLAPSED`): blocked like rock until the corresponding collapse is restored.                                                                                                                                     |
| `' '` (space) | Empty void outside the dungeon.                                                                                                                                                                                                              |

Walls in this game are **edge-based**: doors and thin walls sit on the
boundary between cells, not in a cell. A `#` cell is solid rock; a door
declared on cell `(x, y)` with `side: Side.RIGHT` occupies the edge between
`(x, y)` and `(x+1, y)`.

Letters listed in `corridors` are corridors rather than rooms. Corridors are
discovered exactly like rooms (whole letter at a time); what the listing
changes is corridor-specific functionality: the landslide event picks
collapse candidates from corridor letters (and from `corridorCells`), and
`isCorridorCell` (`src/core/grid.ts`) treats those cells as corridors for
such logic.

## Layout (`defineLayout`)

`layout` accepts the `DeclarativeLayout` object. Every entity supports
several shorthand formats: a positional tuple, a plain object, or the full
runtime type. Positions may always be written as `[x, y]` tuples or
`{x, y}` objects.

| Field             | Type                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :---------------- | :------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grid`            | `string[]` (required)                        | The ASCII matrix (see above).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `doors`           | `DeclarativeDoor[]`                          | Doors on cell edges. Tuple: `[side, x, y, options?]`; options: `locked`, `hidden`, `open`, `reinforced`, `id`, and `trapped` — `trapped: true` gives one trap attack, a number gives that many. Object form: `{ side, x, y, locked?, hidden?, trapped?, open?, reinforced?, id? }`. The door sits on the `side` edge of `(x, y)`, conventionally between two floor cells of different letters. Hidden doors are invisible until searched for; trapped doors attack the opener; locked doors need the right key/item to open. |
| `monsters`        | `DeclarativeMonster[]`                       | Tuple: `[type, colour, x, y, inventory?, id?]` (what `createMonster` / `createMonsterWithInventory` in `src/dungeon/DungeonLogic.ts` produce). `type` is any registered monster type — the built-ins (`MonsterType.ORC`, `TROLL`, the four Dark Lords) or a campaign-registered type (see [Adding new monsters](../src/campaigns/README.md#adding-new-monsters-optional)).                                                                                                                                                   |
| `secrets`         | `DeclarativeSecret[]`                        | Tuple: `[SecretType, x, y, nameOrItem?, id?]` where `nameOrItem` is a name translation key or an `Item` the secret hides. Types (`SecretType`): `EQUIPMENT`, `MAGIC_ITEM`, `TRAP_DOOR`, `NOTE`. Secrets are found by hero search actions.                                                                                                                                                                                                                                                                                    |
| `notes`           | `DeclarativeNote[]`                          | Tuple: `[x, y, message, id?]` — flavour text read when a hero steps on the cell; `message` is a translation key.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `items`           | `DeclarativeItem[]`                          | Tuple: `[x, y, item?]` — a specific `Item` on the floor, or with no item a random draw from the campaign's `itemDeck` / `magicItemDeck`.                                                                                                                                                                                                                                                                                                                                                                                     |
| `interactables`   | `DeclarativeInteractable[]`                  | Cells with effects triggered by interaction or stepping (levers, braziers, secret doors, …). Formats and the full property reference: [Adding interactable cells](../src/campaigns/README.md#adding-interactable-cells-optional).                                                                                                                                                                                                                                                                                            |
| `lights`          | `DeclarativeLight[]`                         | Light sources: `[x, y]`, `[x, y, alignment]`, `[x, y, options]` or `[x, y, alignment, options]`, or an object. Ready-made presets (`brazier`, `chandelier`, `torch`, `ember`, `iceBrazier`) live in `src/dungeon/LightSources.ts`. Full property reference: [Adding light sources](../src/campaigns/README.md#adding-light-sources-optional).                                                                                                                                                                                |
| `terrain`         | `DeclarativeTerrain[]`                       | Floor materials: `[x, y, type]` or `[x, y, type, options]`, or an object (`TerrainOptions & {x, y}`). Built-in types: `'water'`, `'lava'` (open-ended like light effects). Options: `color`, `opacity`, `damageOnEnter`, `damageOnTurnEnd`, `movementCost`, `light`, `rate`.                                                                                                                                                                                                                                                 |
| `roomFog`         | `string[] \| Record<string, RoomFogOptions>` | Atmospheric fog filling every cell of a room/corridor, keyed by grid letter. Either letters with default styling, or per-room options (`color`, `opacity`, `rate`, `softness`, `density`, `blocksLight`, `damageOnEnter`, `damageOnTurnEnd`, `nameTranslationKey`). Visual by default; damage fields reuse the environmental damage path of terrain.                                                                                                                                                                         |
| `pillars`, `pits` | `Position[]`                                 | Cells with a pillar (blocks movement, sight and light; its shaft is drawn above figures standing behind it) or a pit.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `corridors`       | `string[]`                                   | Grid letters that are corridors rather than rooms (see [Grid](#grid)).                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `corridorCells`   | `Position[]`                                 | Individual cells inside a room letter that are corridors without a door separating them from the room (e.g. a corridor stub opening straight into a room). They keep the room's letter so they are discovered together with it, but count as corridor cells.                                                                                                                                                                                                                                                                 |
| `walls`           | `DeclarativeWall[]`                          | Thin walls on the edge between two adjacent floor cells — for rooms not separated by a whole `#` cell. Tuple: `[side, x, y, options?]` (options: `colour`), or object `{ x, y, side, colour? }`. A wall on `(x, y, Side.RIGHT)` blocks between `(x, y)` and `(x+1, y)`. Blocks like a closed door and renders as a flat strip.                                                                                                                                                                                               |
| `wallColour`      | `string`                                     | Fill colour of edge walls dungeon-wide; per-wall `colour` wins.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `corners`         | `Corner[]`                                   | Wall-corner render hints. **Auto-detected** from the grid by `autoDetectCorners` (`src/dungeon/cornerDetection.ts`) — you normally never author these.                                                                                                                                                                                                                                                                                                                                                                       |

### `parseTileMap`

Instead of declaring entities in lists, a layout can also be drawn as a
single annotated ASCII map plus a legend: `parseTileMap(mapGrid, legend)`
(`src/dungeon/dungeonParser.ts`) returns a full layout object with grid,
doors, monsters, secrets, notes, items, interactables, pits, pillars and
starting positions. Each legend entry maps a character to a room letter and
any entities placed on that cell, e.g.:

```ts
const tileMap = parseTileMap(['######', '#..L.#', '#..H.#', '######'], {
  '#': { roomOrTile: 'A' },
  '.': { roomOrTile: 'A' },
  L: {
    roomOrTile: 'A',
    interactable: { effect: 'removeTrapsInRoom', oneTime: true },
  },
  H: {
    roomOrTile: 'A',
    interactable: {
      effect: 'addHero',
      args: { name: 'Siedel', colour: Colour.Green },
      oneTime: true,
    },
  },
});
```

The legend supports `roomOrTile` (grid letter), `startingPosition`, `pit`,
`pillar`, `door`, `monster`, `secret`, `item`, `note` and `interactable`.
The returned object is passed as `layout` to `defineDungeon`.

## Win conditions

Each entry in `winConditions` is checked every turn (`checkWinConditions` in
`src/game.ts`); the dungeon is beaten when all are fulfilled. Author them
with `fulfilled: false` — the engine sets the flag during play.

| `ConditionType`    | Fulfilled when                              | Extra fields        |
| :----------------- | :------------------------------------------ | :------------------ |
| `KILL_ALL`         | Every monster in the layout is dead         | —                   |
| `KILL_ALL_OF_TYPE` | Every monster of one type is dead           | `targetMonsterType` |
| `KILL_AT_LEAST`    | The dungeon's `killCount` reaches a minimum | `killMinCount`      |
| `REACH_CELL`       | Any living hero stands on the target cell   | `targetCell`        |
| `OPEN_DOOR`        | The door at the target position is open     | `targetCell`        |
| `SECRET_FOUND`     | The target secret has been found            | `targetSecretId`    |

Additional fields on `WinCondition`:

- `checkFulfilled?: string` — key of a custom check in the `onCheckFulfilled`
  registry (`src/dungeon/DungeonLogic.ts`), overriding the built-in check
  (built-in: `'hasNecklaceOfLight'`).
- `additionalDescription?: string` — translation key shown next to the
  primary objective, e.g. for secondary goals.

## Validation

`defineDungeon` validates by default (`assertValidDungeon`,
`src/dungeon/dungeonValidator.ts`; pass `{ validate: false }` to skip). An
invalid dungeon throws at module load with the full error list. The rules:

- All grid rows have the same non-zero length.
- Every placed entity (monster, item, secret, note, interactable, light,
  starting position) is inside the grid and on a floor cell — not on `#`,
  `?` or a void cell.
- Doors are in bounds, not on void cells, have a valid side and unique ids.
- Edge walls sit between two existing cells, never on the same edge as a
  door or another (mirrored) wall.
- Ids are unique per entity kind (monsters, doors, secrets,
  interactables, lights).
- `corridors`, `roomFog` keys and `discoveredRooms` letters exist in the
  grid; `corridorCells` sit on room cells not already fully declared as
  corridors, without duplicates.
- Win-condition target cells are inside the grid.
