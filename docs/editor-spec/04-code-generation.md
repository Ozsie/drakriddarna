# 04 — Code Generation

The generator turns an `EditorProject` into the files the game auto-discovers.
Output must:

1. Compile in the game repo (`npm run check` passes).
2. Match Prettier config (`.prettierrc`: single quotes, print width 80,
   2-space indent, trailing commas `all`) so `npm run prettier` passes
   without reformatting.
3. Be byte-for-byte deterministic for the same project input (no timestamps,
   no unstable ordering). Golden-file tests depend on this.
4. Only reference game APIs that exist in `src/types.ts` and
   `src/dungeon/dungeonParser.ts`.

Style rules for generated code (mirror the existing campaign files):

- Single quotes, semicolons, trailing commas, 2-space indent, <= 80 columns
  (wrap tuple arrays one element per line when they exceed it, exactly as in
  `e1m0.ts`).
- LF line endings, final newline at EOF.
- Use the **tuple shorthand** for doors, monsters, secrets, notes, items,
  positions and starting positions — matching the existing style:

  ```ts
  doors: [
    [Side.RIGHT, 3, 9],
    [Side.UP, 7, 7, { hidden: true }],
  ],
  monsters: [
    [MonsterType.ORC, Colour.Green, 6, 9],
    [MonsterType.TROLL, Colour.Yellow, 7, 3, [magicItems[3]]],
  ],
  secrets: [
    [SecretType.MAGIC_ITEM, 16, 6, magicItems[0]],
  ],
  items: [[11, 3, magicItems[4]]],   // [x, y] alone = random loot
  ```

  Doors with any non-default flag use the options object; plain doors are the
  3-element tuple. Use object form for lights when options are set.

- Enum references as members: `Side.RIGHT`, `Colour.Green`,
  `MonsterType.ORC`, `ConditionType.KILL_ALL`, `SecretType.NOTE`,
  `CellAlignment.CEILING`.
- Shared item/monster references come from the catalog:
  `magicItems[4]`, `weapons[0]` — plus the corresponding import lines
  (`import { magicItems } from '../../../items/magicItems';`). Only emit
  imports actually used.
- Never invent helper functions in generated files. Only `defineDungeon`,
  `newHero`, catalog imports and enum/type imports.

## File: `campaign.ts`

```ts
// GENERATED FILE - DO NOT EDIT. Source: campaign.editor.json (Drakriddarna Campaign Editor).
import type { Campaign, Item } from '../../types';
import { weapons } from '../../items/weapons';
import { armours } from '../../items/armours';
import { shields } from '../../items/shields';
import { magicItems } from '../../items/magicItems';
import { Colour } from '../../types';
import { newHero } from '../../hero/HeroLogic';
import { e1m0 } from './dungeons/e1m0';
// ...one import per dungeon, in chain order

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

const campaignMyCampaign: Campaign = {
  id: 'myCampaign',
  name: 'campaign.myCampaign.name',
  dungeons: [e1m0],
  heroes: [
    newHero('Fearik', Colour.Yellow),
    newHero('Helbran', Colour.Red),
    newHero('Siedel', Colour.Green),
    newHero('Wulf', Colour.Blue),
  ],
  itemDeck: getItemDeck(),
  magicItemDeck: getMagicItemDeck(),
};

export default campaignMyCampaign;
```

Variable name: `campaign<PascalCase(id)>`. If the project sets a tileset, emit
`tileset: './tilesets/<file>'`-style relative path as given in the project
(no image imports in v1; the path must be a static URL the game can fetch —
document in the UI that the asset must exist in `static/` or be importable).

## File: `dungeons/<id>.ts`

```ts
// GENERATED FILE - DO NOT EDIT. Source: campaign.editor.json (Drakriddarna Campaign Editor).
import type { Dungeon } from '../../../types';
import {
  ConditionType,
  MonsterType,
  SecretType,
  Side,
  Colour,
  CellAlignment,
} from '../../../types';
import { defineDungeon } from '../../../dungeon/DungeonLogic';
import { magicItems } from '../../../items/magicItems';
import { e1m1 } from './e1m1';

export const e1m0: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m0.name',
  intro: 'campaign.iceDragon.e1m0.intro',
  nameTranslationKey: 'campaign.iceDragon.e1m0.name',
  winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
  nextDungeon: e1m1,
  startingPositions: [
    [2, 9],
    [1, 8],
  ],
  discoveredRooms: ['A'],
  ambientLight: 0.2,
  layout: {
    grid: [
      '     ######',
      '     #CCCC#',
      // ... exact rows, quoted, in order
    ],
    doors: [[Side.RIGHT, 3, 9]],
    monsters: [[MonsterType.ORC, Colour.Green, 6, 9]],
    secrets: [[SecretType.MAGIC_ITEM, 16, 6, magicItems[0]]],
    notes: [[4, 2, 'campaign.iceDragon.e1m0.notes.hint1']],
    items: [[11, 3, magicItems[4]]],
    lights: [
      [
        2,
        9,
        CellAlignment.CEILING,
        { color: '#c29042', radius: 3, intensity: 0.5, softness: 0.7 },
      ],
    ],
    corridors: ['D', 'E'],
  },
  events: [1, 2, 3, 4, 5, 6],
});
```

Rules:

- Grid rows are emitted as single-quoted strings, one per line, in a
  wrapped array. Rows are padded with spaces to the grid's rectangular width.
- `nextDungeon` chains to the **next** dungeon in `campaign.dungeonIds`;
  the last dungeon has no `nextDungeon` and no import.
- Omit optional fields entirely when at their default/empty (`events`,
  `ambientLight` = 1, `tileset`, `music`, `collapsedCorridor`, `portal`,
  `onRoomDiscovered`, empty arrays).
- `nameTranslationKey` is always emitted explicitly (defineDungeon falls
  back to `name`, but explicit keys keep translations greppable).
- Win conditions include `fulfilled: false` (matches existing files).
- Interactables use the object form with `x`/`y`:
  `{ x: 3, y: 8, effect: 'toggleLight', args: { ... } }`.

## Files: `translations/en.json`, `translations/sv.json`

Nested JSON matching the campaign's existing convention (see
`src/campaigns/iceDragonTreasure/translations/en.json`): the project's
`translationNamespace` is the root object; nested keys follow the entity
paths (`e1m0.name`, `e1m0.notes.hint1`, `secrets.mirror.name`, ...).
2-space indent, one trailing newline. Only keys under the campaign namespace
are written; the generator **never** touches any other root keys in these
files if they exist (merge with marker-protection as in 03). Log translation
files (`logs.en.json`, `logs.sv.json`) are written only when the project
contains log keys, with the same rules.

## Determinism and testing

- Deterministic ordering everywhere: dungeons in chain order; layout arrays
  in (y, x) sorted order within each kind; imports sorted by module path;
  translation keys sorted alphabetically at emit time... except grid rows,
  which keep their natural order.
- Golden-file tests in `core/src/commonTest`: a fixture project must
  generate the committed expected outputs byte-for-byte
  (`goldens/campaign.ts`, `goldens/e1m0.ts`, `goldens/en.json`, ...).
  When the generator legitimately changes, goldens are regenerated by a
  test helper and reviewed in the diff.
- A cross-check test validates that the fixture's generated TS parses under
  the game's Prettier config; if wiring Prettier into the Kotlin test suite
  is impractical, the milestone checklist (08) requires one manual
  `npm run prettier` + `npm run check` run in the game repo against generated
  output.
