# 01 — Architecture

## What already exists (no engine work)

The campaign is buildable largely from the campaign-local registration
patterns documented in
[src/campaigns/README.md](../../src/campaigns/README.md):

```
src/campaigns/elfKingCastle/
  campaign.ts              // Campaign object, default export (auto-discovered)
  dungeons/
    floor1.ts floor2.ts floor3.ts   // per the magazine's three floor plans
  items/
    customItems.ts         // Alvsköld, Astari-armbandet, medaljong, spegel
  monsters/
    customMonsters.ts       // Teneldor/the Red Dark Lord + castle monsters
  heroes/
    elfHeroes.ts            // Mithrael and Gilyad
  translations/
    en.json sv.json
    logs.en.json logs.sv.json
```

- **Auto-discovery**: `src/campaigns/index.ts` picks up `campaign.ts` via
  `import.meta.glob`; translations are merged by
  `src/lib/translations/index.ts`. No registration edits.
- **Items**: `registerItemEffect` / `registerItemReset` /
  `registerItemPickup` / `registerItemDrop`
  (`src/items/ItemLogic.ts`), string-keyed like the monsters below.
- **Monster**: `registerMonsterTemplate` / `registerMonsterAbility` /
  `registerMonsterAbilityHandler` / `registerMonsterBehaviors`
  (`src/monsters/MonsterRegistry.ts`). `MonsterType` is an open
  string type — the boss's type needs no change to `src/types.ts`.
- **Dungeons**: `defineDungeon` / `defineLayout` / `parseTileMap`
  (`src/dungeon/dungeonParser.ts`), win conditions from
  `ConditionType`, edge-based walls (`Side` tuples), secrets,
  interactables (including the built-in `'nextDungeon'` effect used by
  the stairs), `ambientLight`.
- **Events**: `Campaign.eventDeck` + `registerEventEffect`
  (`src/events/EventsLogic.ts`) with per-floor filtering via
  `Dungeon.events`.
- **Rank-coloured dice**: `roll(level, dice)` in `src/core/dice.ts`
  already rolls dice of the acting hero's rank colour — Alvsköld's
  "1 die of the same colour as the rank" is just a `Weapon` with
  `dice: 1`, no engine work.

## The engine changes (each specified in its own section)

| #   | Change                                                                                                                                                                                                                                 | Spec | Why (source text)                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a   | **Darkness reveal rule** — optional per-dungeon `contentRevealRadius`; monsters and floor items render (and are inspectable) only once a hero is within that many squares                                                              | 03   | "Alvkonungens Borg är försatt i evigt mörker … spelarna får inte se vad som finns i ett rum förrän de befinner sig inom två rutors avstånd"                                                          |
| b   | **Boss alternation + protected form** — the tower figure alternates Teneldor ↔ Red Dark Lord every other round; while in Elf King form heroes cannot target him (new hero-side untargetable flag), while he still attacks every round | 05   | "Varannan omgång är han sig själv, varannan omgång förvandlas han till den röde Mörkerherren. Han anfaller dock i båda formerna … Äventyrarna får inte anfalla honom när han har alvkonungens kropp" |
| c   | **Force-field attack gating** — monsters may not attack heroes standing in cells adjacent to the armband's bearer while the field is active                                                                                            | 04   | "Skapar ett magiskt kraftfält i alla rutor intill bäraren i vilket ingen monster får anfalla"                                                                                                        |
| d   | **Per-hero level display names** — additive optional field resolving `${prefix}.${level}` with fallback to `content.level.*`                                                                                                           | 06   | Mithrael's card ladder is Lärling/Adept/Trollkarl/Magiker/Mästare (mage titles), not the standard Lärling/Riddare/Hjälte/Furste/Mästare                                                              |

All four are deliberately minimal mechanics wired at the existing hook
sites (rendering/visibility, hero attack target validation, monster
attack selection, level display) and are specified so the built-in
campaigns are byte-for-byte unaffected when unused. A hero
special-ability framework is **deferred** (06) — the printed hero
cards resolve to existing mechanics (an item and a stat), so it is not
part of this campaign's engine changes.

## Dependency: the welcome-screen game flow

This spec builds on
[docs/welcome-screen-spec/](../welcome-screen-spec/), which defines the
new game flow: app opens on the welcome screen, New Game goes through
the campaign/game-master/mode dialog and then **hero selection**
(`04-hero-selection.md`: select and rename 1..`Campaign.maxHeroes`
heroes from the roster, passed into the run via the `init()` heroes
override). That spec adds `Campaign.maxHeroes` and the `init()`
override; this campaign consumes both (`maxHeroes: 2`, roster of the
two elves) with no further extension. If the welcome-screen
spec is not yet implemented, milestones M1–M5 of this spec can still be
built and tested through `init(campaignId)` directly; 07 and M6 land on
top of the welcome flow.

## Module responsibilities

| Area                | Existing modules consumed                                                                                              | New modules                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Campaign bundle     | `campaigns/index.ts` auto-discovery, translations glob                                                                 | `campaign.ts`                               |
| Items               | `items/ItemLogic.ts` registries                                                                                        | `items/customItems.ts`                      |
| Monster             | `monsters/MonsterRegistry.ts`, `MonsterLogic.ts`                                                                       | `monsters/customMonsters.ts`                |
| Hero level names    | `hero/HeroLogic.ts`, `ui/HeroCardRendering.ts`                                                                         | — (display wiring only)                     |
| Darkness reveal     | `monsters/MonsterRendering.ts`, `items/ItemRendering.ts`, room discovery in `hero/HeroLogic.ts`                        | reveal helpers + tests (site decided in 03) |
| Boss protected form | hero target validation (`hero/ClickInputLogic.ts`, `core/combat.ts` cursor), monster turn (`monsters/MonsterLogic.ts`) | — (wiring in `customMonsters.ts`)           |
| Force field         | monster attack selection (`monsters/MonsterLogic.ts`)                                                                  | — (effect registered in `customItems.ts`)   |
| Dungeons            | `dungeon/dungeonParser.ts`, `dungeon/dungeonValidator.ts`                                                              | `dungeons/floor{1,2,3}.ts`                  |
| Game flow           | `menu/MenuLogic.ts`, `game.ts` (`init`), `store/`, `ui/`                                                               | —                                           |

## Spec-sync duties (repository rule)

Any change to `src/types.ts` in this work (`Hero.levelNameKey`, the
dungeon `contentRevealRadius` option, the hero-untargetable monster
flag) must update, in the same change:
[docs/campaign-definition.md](../campaign-definition.md),
[docs/dungeon-definition.md](../dungeon-definition.md) (for the
dungeon-level field),
[src/campaigns/README.md](../../src/campaigns/README.md), plus
`TECHNICAL.md` (darkness reveal, boss mechanic, per-hero level
names). Do not let them drift.
