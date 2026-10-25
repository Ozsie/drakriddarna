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
- [ ] Sound Effects
- [ ] Multiple saves
- [ ] Responsive layout
- [ ] Graphics
  - [ ] Sprites for actors
  - [ ] Tileset for dungeons
  - [ ] Sprites for items etc
- [ ] Alvkonungens Borg -  [Official Dungeon and Heroes](https://cf.geekdo-images.com/vmuWDOTFI7ZB5ekSB21-IQ__imagepagezoom/img/GiEIZp0p97dhk9TawLzxLWxjIiA=/fit-in/1200x900/filters:no_upscale():strip_icc()/pic1072132.jpg)
  - [X] Edge based walls
- [ ] Level editor
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
