# AGENTS.md

Web adaptation of the Drakriddarna (Dragonfire) board game. SvelteKit + TypeScript, fully custom canvas rendering (no game engine), deployed as a static site.

## Commands

```bash
npm run dev              # dev server
npm run build            # production build (static adapter)
npm run check            # svelte-check (type checking, strict TS)
npm test                 # vitest (benchmark tests are excluded unless BENCHMARK=true)
npm run benchmark        # game logic benchmarks
npm run balanceAnalysis  # campaign balance analysis
npm run lint             # eslint over .ts files
npm run prettier         # prettier check
npm run prettier:format  # prettier fix
```

Run `npm run check`, `npm test`, and `npm run lint` before considering work done. `npm test` does not cover `src/benchmark/**` unless run via the `benchmark` script.

## Rules and content authority

- [RULES.md](./RULES.md) is the player guide and the authority on game rules. Game logic changes must match it; if code and RULES.md disagree, ask before "fixing" either side.
- [src/campaigns/README.md](./src/campaigns/README.md) and [src/gameMasters/README.md](./src/gameMasters/README.md) describe how to add campaigns and game masters. Campaigns are self-contained folders auto-discovered by `src/campaigns/index.ts` — never register a campaign by editing core code.
- Items, monsters, events, and interactables in `src/items/*`, `src/monsters/*`, `src/events/*`, `src/interactables/*` are global and shared across campaigns.
- `scripts/export-editor-catalog.ts` generates the editor catalog from `src/` — never hand-edit the generated output.

## Architecture notes

- `src/game.ts` is the central game-logic hub; shared primitives live in `src/core/` (dice, grid, combat, logger) and Svelte stores in `src/store/` (`gameStateStore.ts` holds the persistent game state).
- Game logic is engine-agnostic TypeScript with colocated tests; Svelte components and canvas rendering in `src/ui/`, `src/components/`, `src/menu/` are thin layers over the logic.
- All user-facing strings go through sveltekit-i18n with both English and Swedish: shared files in `src/lib/translations/{en,sv}/`, campaign/game-master translations in `src/<area>/<name>/translations/{en,sv}.json` (auto-discovered via `import.meta.glob`). Do not hardcode user-visible text.
- Game logic must be deterministic and testable: gameplay-affecting randomness goes through the seedable rng in `src/core/dice.ts`, never `Math.random()` directly (visual-only effects and id generation are the exception).

## Technical write-up

- [TECHNICAL.md](./TECHNICAL.md) is the technical overview of the project for developers outside the gaming industry (architecture, techniques, technologies, testing, deployment).
- Keep it accurate when you change anything it describes: the architecture/layering, core modules (`src/core/`, `src/game.ts`), state and persistence model, monster AI and Game Masters, rendering/lighting approach, i18n, auto-discovery (`import.meta.glob`), benchmarks, tooling, or the build/CI/deploy pipeline.
- The write-up describes components and techniques, not line numbers or exact counts — update it in the same change as the code; do not let it drift.
- New features at the level of the existing sections (e.g. a new rendering technique, a changed save format, a new benchmark capability) get a matching paragraph or section update.

## Campaign and dungeon definition specs

- [docs/campaign-definition.md](./docs/campaign-definition.md) and
  [docs/dungeon-definition.md](./docs/dungeon-definition.md) are the
  field-by-field reference for the content definition types: the `Campaign`
  object and campaign folder structure, and the `Dungeon` type with its
  `defineDungeon`/`defineLayout`/`parseTileMap` authoring DSL, win conditions
  and validation rules.
- Update them in the same change as any edit to what they document: the
  `Campaign`, `Dungeon`, `Layout`, `WinCondition` and related types in
  `src/types.ts`; the declarative shorthand formats, defaults and parsing in
  `src/dungeon/dungeonParser.ts`; the structural rules in
  `src/dungeon/dungeonValidator.ts`; and the win-condition checks in
  `src/game.ts` or the registries they reference (`onCheckFulfilled`,
  `roomEffects`).
- The specs list exact default values, tuple shorthands and validation
  rules — a changed default, an added/removed/reordered field or a new
  validation rule must be reflected there; do not let them drift from the
  parser.
- [src/campaigns/README.md](./src/campaigns/README.md) is the hands-on
  how-to; when a documented authoring capability changes, update the spec and
  the README together, not just one of them.

## Code style

- Prettier with single quotes, 2-space indent, trailing commas (`npm run prettier:format`).
- ESLint is strict TypeScript: `no-console` and `no-explicit-any` are errors — use the logger in `src/core/logger.ts` and proper types.
- Prefer `import type` for type-only imports; relative imports within `src/` (except `$app/environment` and other SvelteKit aliases).
- Tests are colocated as `*.test.ts` next to the code they cover; add tests for any game-logic change.
- TypeScript is in strict mode (`tsconfig.json`) — no `any`, no unchecked assertions where avoidable.
