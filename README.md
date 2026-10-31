# Drakriddarna

A web-based adaptation of the [Drakriddarna (Dragonfire)](https://boardgamegeek.com/image/4326455/dragonfire) tactical turn-based dungeon-crawler board game. Lead a party of heroes through peril-filled dungeons, battle monsters, discover hidden rooms and treasures, and defeat the Dark Lords to conquer campaigns.

The full player guide, rules, and playability adaptations can be found in [RULES.md](./RULES.md).

[Board Game Geek](https://boardgamegeek.com/image/4326455/dragonfire)

[Rules inconsistencies](https://boardgamegeek.com/thread/2896557/rules-omissions-ambiguities-and-oddities)

## Todo

See [TODO](./TODO.md)

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) / [Svelte](https://svelte.dev/) with static adapter
- [TypeScript](https://www.typescriptlang.org/)
- Canvas-based game UI (fully custom rendering, no game engine)
- [sveltekit-i18n](https://github.com/jhubbard/sveltekit-i18n) for translations (English/Swedish)
- [Vite](https://vitejs.dev/), [Vitest](https://vitest.dev/), [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/) for tooling

See [technical write up](./TECHNICAL.md) for details.

## Creating Campaigns

See [Campaign Readme](src/campaigns/README.md)

## Creating Game Masters

See [Game Master Readme](src/gameMasters/README.md)

## Rules and playability adaptions

See the [Rules & Player Guide](./RULES.md).

## AI Policy

This project uses AI tools during development: 
- To produce, test and review code
- To create translations of in game texts

No AI is used to produce art, music, source in game texts, campaigns, dungeons, or other game content.

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
