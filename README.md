# Drakriddarna

A web-based adaptation of the [Drakriddarna (Dragonfire)](https://boardgamegeek.com/image/4326455/dragonfire) tactical turn-based dungeon-crawler board game. Lead a party of heroes through peril-filled dungeons, battle monsters, discover hidden rooms and treasures, and defeat the Dark Lords to conquer campaigns.

The full player guide, rules, and playability adaptations can be found in [RULES.md](./RULES.md).

[Board Game Geek](https://boardgamegeek.com/image/4326455/dragonfire)

[Rules inconsistencies](https://boardgamegeek.com/thread/2896557/rules-omissions-ambiguities-and-oddities)

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) / [Svelte](https://svelte.dev/) with static adapter
- [TypeScript](https://www.typescriptlang.org/)
- Canvas-based game UI (fully custom rendering, no game engine)
- [sveltekit-i18n](https://github.com/jhubbard/sveltekit-i18n) for translations (English/Swedish)
- [Vite](https://vitejs.dev/), [Vitest](https://vitest.dev/), [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/) for tooling

## Creating Campaigns

See [Campaign Readme](src/campaigns/README.md)

## Creating Game Masters

See [Game Master Readme](src/gameMasters/README.md)

## Rules and playability adaptions

See the [Rules & Player Guide](./RULES.md).

## Todo

### Worth investigating
- [ ] Necklace of Light: usable once per round and makes the wearer fully untargetable (esp. e1m6) — consider once per scenario and/or a weaker effect
- [ ] Potion of Speed never resets (`USED` without `RESET_ON`) — add `RESET_ON: [NEXT_SCENARIO]` if once-per-scenario is intended
- [ ] Items lost when a monster is killed by non-hero damage (earthquake): the monster is never removed from the layout, grants no XP and doesn't count toward `KILL_AT_LEAST`, and its inventory is lost — route all deaths through one `killMonster`-style path (like the sun-stone event does); chaos-sword kills now transfer inventory via the shared `killMonster`, dead monsters no longer trigger the zone of control, and the earthquake case is what remains
- [ ] `checkForNextToMonster` ignores room discovery — heroes are halted (and log-spoiled) by monsters standing in undiscovered areas
- [ ] Diagonal movement cost differs between click-path (`distanceInGrid`, `floor(√2·diagonals + straights)`) and keyboard steps (1 per step) for paths with 3+ diagonal cells — unify
- [ ] Dark lord fire spray deviations: officially an adjacent rider forces the sword (impl can spray), the green lord hits one rider plus adjacent figures (impl hits the whole room), and monster targets aren't LOS-filtered
- [ ] Door opening: officially only the square directly in front of a door can open it (a figure standing there blocks others) — impl allows opening from any adjacent square including diagonals
- [ ] Event deck subsets: officially the tutorial has no event cards and adventures 1-2 use only cards 1-6 (7-16 come later) — impl uses the full deck from e1m1 with GM pacing instead — consider per-dungeon subsets
- [ ] Pit fall damage: officially a normal attack with 3 white dice where armour doesn't protect (shields unaddressed, presumably protect) — impl ignores both — decide
- [ ] Dropped equipment: officially any rider can pick it up from a square adjacent to the marker — impl requires standing on the item tile
- [ ] Missable win-condition items (giant's glove for e1m6, necklace for e1m4) plus no looting of fallen heroes can softlock scenarios — consider looting dead heroes, passing items to adjacent heroes, or fallback hints
- [ ] Earthquake damage is reduced by armour and shields — decide whether the boulder should ignore them
- [ ] Door traps (1-2 dice) are weak compared to the suggested 3 dice — reconsider `trapAttacks` values
- [X] Orc bow LOS: officially the shot line is blocked by any figure — already correct: the combat LOS path (`stepAlongLine` with `walking=false`) blocks heroes and monsters; only the walking variant ignores heroes

### Refactorisation

#### Optimization
- [ ] `executeSlotAction` rebuilds `createPassableGrid` in its fallbacks although the monster turn already built one — pass it through
- [ ] `findVisibleHeroes` is recomputed per slot, each time running resolution-48 `hasLineOfSight` per hero — compute once per monster turn (or cache LOS results)
- [ ] Route remaining `Math.random()` gameplay paths (event deck shuffle, random item, spawn and temperament picks, fountain draw) through the seeded rng; also pick a random spawn cell instead of `pool[0]`
- [ ] `Dungeon.svelte` is 2100+ lines against the thin-layer architecture note — split logic into colocated `.ts` modules
- [X] `takeDamage` scanned the inventory and logged "usedEffect" for every matching bonus item on every attack — passive bonuses are now silent; the ring only logs when a re-roll actually happens

## Features
- [ ] Multiple saves
- [ ] Responsive layout
- [ ] Graphics
  - [ ] Sprites for actors
  - [ ] Tileset for dungeons
  - [ ] Sprites for items etc
- [ ] Alvkonungens Borg -  [Official Dungeon and Heroes](https://cf.geekdo-images.com/vmuWDOTFI7ZB5ekSB21-IQ__imagepagezoom/img/GiEIZp0p97dhk9TawLzxLWxjIiA=/fit-in/1200x900/filters:no_upscale():strip_icc()/pic1072132.jpg)
  - [X] Edge based walls
- [ ] Level editor
- [X] Sound Effects
- [X] e1m5
  - [X] multiple copies of items in treasure room
  - [X] hidden door in treasure room can't be opened__
- [X] e1m4 hidden stare requirement not working
- [X] Between dungeons screen (level up, trade, more?)
- [X] Trade Items?
- [X] Reset caved in corridor
- [X] Doors blocking monsters
- [X] Diary on mobile
- [X] Use items from radial menu
- [X] Indicators show on not yet revealed monsters
- [X] Fully Canvas UI
- [X] Monster cards
- [X] Earth Hour Campaign - [Dungeons](https://hearthelamentationoftheplayers.home.blog/tag/drakriddarna/)
- [X] Support for additional campaigns
- [X] Dungeon intro screen
- [X] Difficulty levels
- [X] e1m6 - The Final Battle
- [X] e1m5 - The Ice Dragons Treasure
- [X] Select door on click when multiple doors in same cell
- [X] Create function for random item on floor
- [X] Trigger traps when heroes move through a cell with a trap
- [X] Stop search through walls & doors
- [X] Corners
- [X] Green dark lord paralyzing sword
- [X] Magic Item/Weapon: Sword of Chaos
- [X] e1m4 - The Dark Citadel
- [X] Event #16 - The Hexagram
- [X] Show current event
- [X] Translations
- [X] Menu system
- [X] Monster special attack
  - [X] Diagonal fire attack (yellow dark lord)
  - [X] Orthogonal fire attack (red dark lord)
  - [X] In same room & next to fire attack (green dark lord)
  - [X] All of the above (blue dark lord)
- [X] Hints for secrets
- [X] e1m3 - Labyrinth of Horror
- [X] Show level win conditions & button to move on
- [X] Linting
- [X] Secrets
- [X] Drop Items
- [X] Monster blocking move on click move
- [X] Render pillars & pits
- [X] Render on demand
- [X] Click movement must take LoS into account for range
- [X] e1m2 - Mines of Evil
- [X] Events
- [X] e1m1 - The Three Gates of Power
- [X] Magic Items
- [X] Centering on spawn
- [X] Split game.ts, move code out of routes
- [X] Line of sight
- [X] Monster range attack
- [X] Move render code to .ts files
- [X] Items
- [X] Clearing dungeon
- [X] Trap Doors
- [X] Moving through other heroes
- [X] Leveling up
- [X] e1m0 - Troll Cave
- [X] Hidden doors
- [X] Trapped doors
- [X] Monster movement
- [X] Monster close combat attack
- [X] Locked doors
- [X] Saving & loading

### Bugs
- [X] RULES.md XP wording is wrong: the official rules (and the code) award the killer monster-specific points (orc 1, troll 2, dark lord 4) plus +1 per surviving rider per adventure — replace "every surviving hero earns +1 per kill"
- [X] Halberd (range-2) attacks ignore line of sight — require `hasLineOfSight` in the attack branch of `onTargetCell` and the sword cursor in `getCursorType`
- [X] Click movement (`onTargetCell`) bypasses the zone-of-control halt (path loop continues after movement is zeroed) — break on 0 movement (note: passing through other heroes is legal per the official rules)
- [X] Searching is allowed while adjacent to a monster — the official rules forbid LETA next to a monster — gate the Search action (and lock picking, which is a LETA)
- [X] Heroes cannot move through other dragon riders — the official rules allow pass-through (just not stopping in the same square) — verified: click-path movement already passes through heroes, stepwise moves cannot stop on one
- [X] Click movement skips `checkForItemRevealedSecret`, unlike stepwise `move()` — e.g. e1m4's necklace stair won't reveal on click moves
- [X] Foresight event pops the wrong secret (`secrets.pop()` ignores its own filter) — pick from the filtered `notDiscoveredSecret` list and skip secrets without items
- [X] Ring of Precision re-roll is a no-op (`takeDamage` recomputes the same result) and has no once-per-round limit (RULES.md) — re-roll the attack dice when damage is 0 and cap usage
- [X] Two landslides in one deck cycle lose the first corridor (`collapsedCorridor` holds one letter, `restoreCorridor` replaceAll can mislabel cells) — track each collapse separately (`collapsedCorridors` with exact cells)
- [X] `randomItem`/`randomMagicItem` return undefined when the deck is empty and crash on `.amountInDeck` — guard the callers
- [X] Revived heroes keep their old level at 0 XP — reset `hero.level` to Apprentice in `replaceDeadHeroes` (official rules: points vanish, restart as Apprentice, equipment kept)

### Dead code
- [X] `executeGameEvent` and the ~90-line `GameEvent` union in `types.ts` were unused outside tests — removed (along with the union's dedicated test; `GameEventType` remains for `TurnEvent.type`)
- [X] `EventDifficulty.minSpawnDistance` / `earliestRound` fallback fields were never set by any game master — dropped from the type and the getters
- [X] `game.ts` barrel re-exported ~70 symbols with only three production importers — trimmed to the functions actually imported (`init`, `loadState`, `save`, `next`, `endAction`, `resetLevel`, `hasWon`, `removeDamageIndicator`); also removed the dead `load` and `advanceToNextDungeon` functions found during the trim
- [X] Effect-key aliases (`theLostOrc`, `theOrcDrums`, `foreSight`) — removed; the live card keys `theLostOrch`, `theOrchDrums`, `foresight` now hold the implementations
- [X] `newHero` mutated the shared `weapons[0]` template (`amountInDeck--`) at module level — removed (decks are built from templates before heroes are created, and the sword template has no deck copies)

### Duplicated code
- [X] Action-cost block (`actions > 1 && movement < max ? -2 : -1`) repeated in attack/search/interact/pickLock/herbs/chaos sword — extracted `spendStandardAction` + `settleMovementAfterAction` in core (documented against `consumeActions`)
- [X] `distanceInGrid` defined in both `core/grid.ts` and `ClickInputLogic.ts`, and `MonsterLogic` imported the hero-side copy — only the core one remains; monster modules import from core
- [X] Side-to-offset switch triplicated (`isDoorEdge`/`isWallEdge`, pathfinding ×2, `HeroLogic`) — single `sideOffset()` in core
- [X] `moveOverDoor` and `openDoorAtHero` duplicate the open/break-lock/trap sequence — merged into `openDoorAndResolveTrap`
- [X] `killMonster` and chaos-sword `killTarget` duplicate monster removal/XP, and `killTarget` skipped the inventory drop — chaos-sword kills now go through `killMonster` (inventory transferred to the killer)
- [X] `resetOnNext` and `resetOnNextDungeon` are identical except the trigger predicate — merged into `resetItemsOnTrigger`
- [X] Hazard actors (`doorAsActor`, `secretAsActor`, earthquake actor) share most of their boilerplate — one `createHazardActor` factory in core
- [X] `restore*` family in `EventsLogic` repeats the "if any → log → restore" pattern — blinded/weakened/elemental weapon share `restoreHeroState`; the structurally different ones (corridor, disabled items, orc drums) stay separate
- [X] Sun stone and earthquake repeat the same "monsters in this room" filter — extracted `findVisibleMonstersInCell`/`cellFor`
- [X] `GameState` carried `gameMasterId`, `gameMaster` and `difficulty` for the same object — collapsed to a single `gameMaster` field; `loadState` migrates legacy saves
- [X] `onTargetCell` re-implements the per-step `move()` logic (notes, interactables, traps) and had drifted (no item-secret reveal, no ZoC break) — extracted a shared `arriveOnCell` step handler

### Sound Effects

#### Combat & Defense
- [X] Weapon attack (`attackSound`)
- [X] Shield block / deflection (`blockSound`)
- [X] Actor hurt / damage taken (`hurtSound`)
- [X] Actor death (`deathSound`)
- [X] Attack miss / whiff
- [X] Critical hit / heavy blow (e.g. `sword_of_chaos`)
- [X] Ranged projectile flight / launch

#### Environment & Exploration
- [X] Door open (`door_open`)
- [X] Lock picking (`pick_lock`)
- [X] Locked door attempt

#### Traps & Secrets
- [X] Secret found cue / chime
- [X] Trap triggered / sprung (pit, spikes)

#### Movement & Actions
- [X] Actor movement / step (`walkSound`)
- [X] Search action (searching room/tile)

#### Items & Inventory
- [X] Item pick up
- [X] Item use
- [X] Items drop

#### Magic & Status Effects
- [X] Dark Lord fire attack
- [X] Healing effect
- [X] Buff applied
- [X] Debuff applied

#### Events
- [X] Draw card
- [X] Shuffle

#### Tabletop & Game Flow
- [X] UI button click
- [ ] Victory fanfare
- [ ] Defeat / party wipe
- [X] Hero level up

## Controls
### Mouse/touch
* Click in the tile you want to move to
* Click the active hero to open a door, if next to one
* Click the active hero to pick a lock, if next to locked door
* Click the active hero to search
* If within range of a monster, click it to attack

### Keyboard
| Action     | Numpad | Keyboard |   |   |
|------------|--------|----------|---|---|
| Up         | 8      | W        |   |   |
| Left       | 4      | A        |   |   |
| Down       | 2      | X        |   |   |
| Right      | 6      | D        |   |   |
| Up Left    | 7      | Q        |   |   |
| Down Left  | 1      | Z        |   |   |
| Up Right   | 9      | E        |   |   |
| Down Right | 3      | C        |   |   |
| Pick lock  | -      | R        |   |   |
| Search     | +      | F        |   |   |
| Next       | 0      | space    |   |   |

## Developing

Once you've installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Other useful commands:

```bash
npm run test            # run unit tests (Vitest)
npm run check           # type-check with svelte-check
npm run lint            # lint TypeScript files with ESLint
npm run prettier        # check formatting
npm run benchmark       # run playability benchmarks (see below)
```

## Benchmarks

The benchmark suite in `src/benchmark/` simulates fully headless games to measure playability and balance. A bot (`src/benchmark/bot.ts`) plays the hero side with a fixed aggressive playstyle (heals at HP <= 3, attacks enemies in range, searches adjacent secrets/doors; priority: combat > doors > secrets > exploration), while monster turns run with all delays disabled for speed.

Run it with:

```bash
npm run benchmark
```

What it does:

- Plays each benchmarked dungeon (`e1m0` and `e1m1` from Ice Dragon Treasure, `e2m1` from Earth Hour) against all three Game Masters (`storyTeller`, `tactician`, `brutalOverlord`), 500 seeded runs per Game Master for deterministic, comparable results.
- Prints an ASCII report per dungeon to the console with win/loss rates, average turns, hero casualties (± standard deviation), monsters killed, remaining/near-death party HP, wasted searches, and monster spawns — useful for verifying that difficulty tiers feel distinct and that Game Master AI pacing works as intended.
- Also includes a metrics verification test that validates the simulation result tracking itself.

A single simulation run can end in one of three statuses: `WON`, `LOST` or `TIMEOUT` (max turns exceeded).

## Building

To create a production version of your app:

```bash
npm run build
```
