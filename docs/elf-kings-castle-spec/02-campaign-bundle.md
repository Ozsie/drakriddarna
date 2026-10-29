# 02 — Campaign bundle

## `campaign.ts`

Standard shape, mirroring `src/campaigns/earthHour/campaign.ts`, with
the campaign-local additions merged into the decks and the two elven
heroes in the roster:

```ts
import type { Campaign, Item } from '../../types';
import { weapons } from '../../items/weapons';
import { armour } from '../../items/armours';
import { shields } from '../../items/shields';
import { magicItems } from '../../items/magicItems';
import { customItems, customMagicItems } from './items/customItems';
import { elfHeroes } from './heroes/elfHeroes';
import { floor1 } from './dungeons/floor1';

const getItemDeck = (): Item[] => {
  const deck: Item[] = [];
  [...weapons, ...armour, ...shields, ...customItems].forEach((item) => {
    for (let i = 0; i < item.amountInDeck; i++) deck.push(item);
  });
  return deck;
};

const campaignElfKingCastle: Campaign = {
  id: 'elfKingCastle',
  name: 'campaign.elfKingCastle.name',
  dungeons: [floor1],
  heroes: elfHeroes,
  itemDeck: getItemDeck(),
  magicItemDeck: getMagicItemDeck(),
  maxHeroes: 2,
};

export default campaignElfKingCastle;
```

Notes:

- `dungeons` contains the first dungeon only; floors 2 and 3 are
  reached through `nextDungeon` chaining (03). `campaign.dungeons[0]`
  is what the party starts in, consistent with the existing campaigns.
- The custom items are merged into **this campaign's** decks only — the
  shared global decks are never mutated (same rule as every
  campaign-local item).
- `maxHeroes` is the field added by the welcome-screen spec; when it is
  absent the roster size applies. Here it is `2` (the elf roster).

## Roster

The roster is the two elven heroes from the article, **Mithrael** and
**Gilyad** (06) — the intro states the adventure is played with the elf
figures presented in the article, so no base dragon riders are added.
The code supports adding them later if the human wants.

### Colour constraint

`Colour` (`src/types.ts`) has four values, one per hero colour. The
roster of two uses two distinct existing values — no `Colour`
extension is needed for this campaign. (If a future roster exceeds
four, new enum values are additive — `Colour` members are hex
strings, no save impact — but that is out of scope here.)

## Translations

`translations/{en,sv}.json` namespaced under `campaign.elfKingCastle.*`,
auto-merged into the `campaign` namespace. Includes at minimum:

| Key namespace                                      | Contents                                  |
| -------------------------------------------------- | ----------------------------------------- |
| `campaign.elfKingCastle.name`                      | Campaign name (required by `campaign.ts`) |
| `campaign.elfKingCastle.floor{1,2,3}.{name,intro}` | Floor names and intro-screen texts        |
| `campaign.elfKingCastle.rooms.*`                   | Room read-aloud texts (03)                |
| `campaign.elfKingCastle.items.*`                   | Item names + descriptions (04)            |
| `campaign.elfKingCastle.monsters.*`                | The boss's two form names (05)            |
| `campaign.elfKingCastle.heroes.*`                  | Hero names, level-ladder titles (06)      |
| `campaign.elfKingCastle.logs.*`                    | Log messages (`logs.{en,sv}.json`)        |

Swedish is the source language of the original material; the human
authors (or verifies) the `sv` texts first, AI may then produce the
`en` translations — never the reverse.

## Tileset, sprites, music (all human-authored art)

- `campaign.tileset` / per-floor `dungeon.tileset`: an elven-castle
  tileset may be supplied later; until then the built-in
  `src/lib/DungeonTiles.png` renders. Follow
  [docs/tileset-artist-brief.md](../tileset-artist-brief.md).
- Hero sprites: `ActorSprite` sheets on the two elf heroes
  (idle/walk/attack/hurt/death row order, see
  [docs/hero-sprite-artist-brief.md](../hero-sprite-artist-brief.md));
  the static built-in sprite is the fallback.
- Boss sprites: the two form sheets (Teneldor and the Red Dark Lord)
  are human-authored art; the form switch selects between them, with
  the built-in static sprites as fallback.
- Item sprites: optional `ItemSprite` entries on the four items
  (Alvsköld, Astari-armbandet, medaljong, spegel).
- `music` / `musicTension` per floor if tracks exist; otherwise the
  defaults apply.

## Difficulty

The global game masters apply unchanged (there is no per-campaign
difficulty override in the engine today, and this spec does not add
one). If the original material mandates special rules for this
adventure beyond the game masters, they belong in the floor definitions
(events, interactables, monster stats) — not in the difficulty system.
