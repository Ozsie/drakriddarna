# Todo

## Worth investigating

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
- [x] Orc bow LOS: officially the shot line is blocked by any figure — already correct: the combat LOS path (`stepAlongLine` with `walking=false`) blocks heroes and monsters; only the walking variant ignores heroes

## Refactoring

### Optimization

- [x] `executeSlotAction` rebuilt `createPassableGrid` in its fallbacks although the monster turn already built one — the turn grid is now passed through
- [x] `findVisibleHeroes` was recomputed per slot, each time running resolution-48 `hasLineOfSight` per hero — now a per-turn cache (`createVisibleHeroesCache`) recomputes only when the monster, a hero or a blocking figure moves, dies or is ignored (+tests)
- [x] Remaining `Math.random()` gameplay paths (event deck shuffle, random item, spawn/temperament/behavior/fountain picks) now run through the seeded rng (`nextRandom`/`randomInt` in core/dice); the event spawn picks a random eligible cell instead of `pool[0]` — only visual effects and DOM ids still use `Math.random`
- [x] `Dungeon.svelte` was 2100+ lines against the thin-layer architecture note — now a ~130-line shell: pure render signatures in colocated `DungeonBoardSignatures.ts` (+tests), the emoji cursor builder in `ui/UIRendering.ts`, and all canvas/render/pan/hover/event glue in the colocated `DungeonBoardController` class
- [x] `takeDamage` scanned the inventory and logged "usedEffect" for every matching bonus item on every attack — passive bonuses are now silent; the ring only logs when a re-roll actually happens

### Testing

- [x] `DungeonBoardController.ts` and `DungeonBoardSignatures.ts` carried a file-level `restrict-template-expressions` disable — dirty-check interpolations are wrapped in `String()` and both disables are gone
- [x] `DungeonBoardController` had no direct tests — its pure decision parts are now testable and tested: the hover state machine (23 tests) and the UI hit cascade (9 tests) live in colocated modules, and the render signatures have their own tests; the render-loop glue itself remains untested (it needs a DOM)

### Save format

- [x] `GameState` carries a `saveVersion` (see `src/saveMigration.ts`): migrations are explicit, ordered steps with their own tests; `loadState` just calls `migrateSaveState` (+11 tests)

# Features

- [ ] Multiple saves
- [ ] Multiple music intensity levels, based on monster count, health, monster type etc
- [ ] Responsive layout
- [ ] Graphics
  - [ ] Sprites for actors
  - [ ] Tileset for dungeons
  - [ ] Sprites for items etc
- [ ] Alvkonungens Borg - [Official Dungeon and Heroes](<https://cf.geekdo-images.com/vmuWDOTFI7ZB5ekSB21-IQ__imagepagezoom/img/GiEIZp0p97dhk9TawLzxLWxjIiA=/fit-in/1200x900/filters:no_upscale():strip_icc()/pic1072132.jpg>)
  - [x] Edge based walls
- [ ] Level editor
- [x] Sound Effects
- [x] e1m5
  - [x] multiple copies of items in treasure room
  - [x] hidden door in treasure room can't be opened\_\_
- [x] e1m4 hidden stare requirement not working
- [x] Between dungeons screen (level up, trade, more?)
- [x] Trade Items?
- [x] Reset caved in corridor
- [x] Doors blocking monsters
- [x] Diary on mobile
- [x] Use items from radial menu
- [x] Indicators show on not yet revealed monsters
- [x] Fully Canvas UI
- [x] Monster cards
- [x] Earth Hour Campaign - [Dungeons](https://hearthelamentationoftheplayers.home.blog/tag/drakriddarna/)
- [x] Support for additional campaigns
- [x] Dungeon intro screen
- [x] Difficulty levels
- [x] e1m6 - The Final Battle
- [x] e1m5 - The Ice Dragons Treasure
- [x] Select door on click when multiple doors in same cell
- [x] Create function for random item on floor
- [x] Trigger traps when heroes move through a cell with a trap
- [x] Stop search through walls & doors
- [x] Corners
- [x] Green dark lord paralyzing sword
- [x] Magic Item/Weapon: Sword of Chaos
- [x] e1m4 - The Dark Citadel
- [x] Event #16 - The Hexagram
- [x] Show current event
- [x] Translations
- [x] Menu system
- [x] Monster special attack
  - [x] Diagonal fire attack (yellow dark lord)
  - [x] Orthogonal fire attack (red dark lord)
  - [x] In same room & next to fire attack (green dark lord)
  - [x] All of the above (blue dark lord)
- [x] Hints for secrets
- [x] e1m3 - Labyrinth of Horror
- [x] Show level win conditions & button to move on
- [x] Linting
- [x] Secrets
- [x] Drop Items
- [x] Monster blocking move on click move
- [x] Render pillars & pits
- [x] Render on demand
- [x] Click movement must take LoS into account for range
- [x] e1m2 - Mines of Evil
- [x] Events
- [x] e1m1 - The Three Gates of Power
- [x] Magic Items
- [x] Centering on spawn
- [x] Split game.ts, move code out of routes
- [x] Line of sight
- [x] Monster range attack
- [x] Move render code to .ts files
- [x] Items
- [x] Clearing dungeon
- [x] Trap Doors
- [x] Moving through other heroes
- [x] Leveling up
- [x] e1m0 - Troll Cave
- [x] Hidden doors
- [x] Trapped doors
- [x] Monster movement
- [x] Monster close combat attack
- [x] Locked doors
- [x] Saving & loading

## Bugs

- [x] RULES.md XP wording is wrong: the official rules (and the code) award the killer monster-specific points (orc 1, troll 2, dark lord 4) plus +1 per surviving rider per adventure — replace "every surviving hero earns +1 per kill"
- [x] Halberd (range-2) attacks ignore line of sight — require `hasLineOfSight` in the attack branch of `onTargetCell` and the sword cursor in `getCursorType`
- [x] Click movement (`onTargetCell`) bypasses the zone-of-control halt (path loop continues after movement is zeroed) — break on 0 movement (note: passing through other heroes is legal per the official rules)
- [x] Searching is allowed while adjacent to a monster — the official rules forbid LETA next to a monster — gate the Search action (and lock picking, which is a LETA)
- [x] Heroes cannot move through other dragon riders — the official rules allow pass-through (just not stopping in the same square) — verified: click-path movement already passes through heroes, stepwise moves cannot stop on one
- [x] Click movement skips `checkForItemRevealedSecret`, unlike stepwise `move()` — e.g. e1m4's necklace stair won't reveal on click moves
- [x] Foresight event pops the wrong secret (`secrets.pop()` ignores its own filter) — pick from the filtered `notDiscoveredSecret` list and skip secrets without items
- [x] Ring of Precision re-roll is a no-op (`takeDamage` recomputes the same result) and has no once-per-round limit (RULES.md) — re-roll the attack dice when damage is 0 and cap usage
- [x] Two landslides in one deck cycle lose the first corridor (`collapsedCorridor` holds one letter, `restoreCorridor` replaceAll can mislabel cells) — track each collapse separately (`collapsedCorridors` with exact cells)
- [x] `randomItem`/`randomMagicItem` return undefined when the deck is empty and crash on `.amountInDeck` — guard the callers
- [x] Revived heroes keep their old level at 0 XP — reset `hero.level` to Apprentice in `replaceDeadHeroes` (official rules: points vanish, restart as Apprentice, equipment kept)

## Dead code

- [x] `executeGameEvent` and the ~90-line `GameEvent` union in `types.ts` were unused outside tests — removed (along with the union's dedicated test; `GameEventType` remains for `TurnEvent.type`)
- [x] `EventDifficulty.minSpawnDistance` / `earliestRound` fallback fields were never set by any game master — dropped from the type and the getters
- [x] `game.ts` barrel re-exported ~70 symbols with only three production importers — trimmed to the functions actually imported (`init`, `loadState`, `save`, `next`, `endAction`, `resetLevel`, `hasWon`, `removeDamageIndicator`); also removed the dead `load` and `advanceToNextDungeon` functions found during the trim
- [x] Effect-key aliases (`theLostOrc`, `theOrcDrums`, `foreSight`) — removed; the live card keys `theLostOrch`, `theOrchDrums`, `foresight` now hold the implementations
- [x] `newHero` mutated the shared `weapons[0]` template (`amountInDeck--`) at module level — removed (decks are built from templates before heroes are created, and the sword template has no deck copies)

## Duplicated code

- [x] Action-cost block (`actions > 1 && movement < max ? -2 : -1`) repeated in attack/search/interact/pickLock/herbs/chaos sword — extracted `spendStandardAction` + `settleMovementAfterAction` in core (documented against `consumeActions`)
- [x] `distanceInGrid` defined in both `core/grid.ts` and `ClickInputLogic.ts`, and `MonsterLogic` imported the hero-side copy — only the core one remains; monster modules import from core
- [x] Side-to-offset switch triplicated (`isDoorEdge`/`isWallEdge`, pathfinding ×2, `HeroLogic`) — single `sideOffset()` in core
- [x] `moveOverDoor` and `openDoorAtHero` duplicate the open/break-lock/trap sequence — merged into `openDoorAndResolveTrap`
- [x] `killMonster` and chaos-sword `killTarget` duplicate monster removal/XP, and `killTarget` skipped the inventory drop — chaos-sword kills now go through `killMonster` (inventory transferred to the killer)
- [x] `resetOnNext` and `resetOnNextDungeon` are identical except the trigger predicate — merged into `resetItemsOnTrigger`
- [x] Hazard actors (`doorAsActor`, `secretAsActor`, earthquake actor) share most of their boilerplate — one `createHazardActor` factory in core
- [x] `restore*` family in `EventsLogic` repeats the "if any → log → restore" pattern — blinded/weakened/elemental weapon share `restoreHeroState`; the structurally different ones (corridor, disabled items, orc drums) stay separate
- [x] Sun stone and earthquake repeat the same "monsters in this room" filter — extracted `findVisibleMonstersInCell`/`cellFor`
- [x] `GameState` carried `gameMasterId`, `gameMaster` and `difficulty` for the same object — collapsed to a single `gameMaster` field; `loadState` migrates legacy saves
- [x] `onTargetCell` re-implements the per-step `move()` logic (notes, interactables, traps) and had drifted (no item-secret reveal, no ZoC break) — extracted a shared `arriveOnCell` step handler
- [x] The ordered UI hit-test cascade (between-dungeons → intro → top bar → menu → hero cards → monster cards → diary → event card) was repeated in `onMouseDown`, `onClick` and `onMouseMove` — extracted `findUiHit` into colocated `DungeonBoardUiHit.ts` with injectable testers (+tests)
- [x] The hover machine in `onMouseMove` repeated "clear flag → `changed = true`" blocks across branches — extracted pure reducers into colocated `DungeonBoardHover.ts` (+23 tests); `onMouseMove` is now ~90 lines
- [x] `onClick` repeated `if (!state) gameStateStore.set(activeState)` after every UI action (6×) — one `syncStore()` helper

## Sound Effects

### Combat & Defense

- [x] Weapon attack (`attackSound`)
- [x] Shield block / deflection (`blockSound`)
- [x] Actor hurt / damage taken (`hurtSound`)
- [x] Actor death (`deathSound`)
- [x] Attack miss / whiff
- [x] Critical hit / heavy blow (e.g. `sword_of_chaos`)
- [x] Ranged projectile flight / launch

### Environment & Exploration

- [x] Door open (`door_open`)
- [x] Lock picking (`pick_lock`)
- [x] Locked door attempt

### Traps & Secrets

- [x] Secret found cue / chime
- [x] Trap triggered / sprung (pit, spikes)

### Movement & Actions

- [x] Actor movement / step (`walkSound`)
- [x] Search action (searching room/tile)

### Items & Inventory

- [x] Item pick up
- [x] Item use
- [x] Items drop

### Magic & Status Effects

- [x] Dark Lord fire attack
- [x] Healing effect
- [x] Buff applied
- [x] Debuff applied

### Events

- [x] Draw card
- [x] Shuffle

### Tabletop & Game Flow

- [x] UI button click
- [x] Victory fanfare
- [ ] Defeat / party wipe
- [x] Hero level up
