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

## AI policy

Per the [AI Policy in README.md](./README.md):

- AI tools are used to produce, test, and review code, and to create translations of in-game texts (the `en`/`sv` sveltekit-i18n files).
- AI must never be used to produce art, music, source in-game texts, campaigns, dungeons, or other game content. Source texts, campaign/dungeon design, and other game content are human-authored.
- "Source texts" means any new user-facing text content (names, descriptions, logs, UI labels, dialog, etc.). If a change requires new text content, a human authors it — AI may not create it in any language.
- If text content already exists in one language, AI may create the translations into the other languages.
- If a task asks you to author such content, stop and ask instead. When translating, translate existing human texts — do not rewrite, extend, or author new text.

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

## UI kit boundary

- When changing or adding canvas UI, reuse or extend the kit — do not hand-roll new drawing in `src/ui/` or `src/components/`. Compose from the existing primitives and kit widgets first; new or changed chrome goes in a kit component following the module recipe: view model + semantic hits + layout/render in `src/uikit/components/`, the GameState adapter in `src/ui/viewmodels/`, historical entry points kept by a facade in `src/ui/`. A new component is added to `src/uikit/index.ts` in the same change (the completeness test enforces it) and to the view-model table in [docs/ui-kit.md](./docs/ui-kit.md).
- New kit primitives follow the two-consumer rule: extract a shared widget only once a second consumer exists; no speculative options or theme slots.
- `src/uikit/` is the game-agnostic canvas UI kit (theme tokens, primitives, kit widgets, components). It imports no game code, no Svelte and no i18n package — enforced by lint errors plus `src/uikit/boundary.test.ts`.
- The reverse direction holds too: game-logic modules (`src/game.ts`, `src/core/`, `src/monsters/`, ...) must not import `src/uikit/**`, so headless benchmarks stay canvas-free. Only `src/ui/` and `src/components/` cross the boundary.
- Consume the kit through `src/uikit/index.ts` (the public surface; a completeness test fails if a consumed module is missing from it). Components are driven by plain view models; `src/ui/viewmodels/` adapters are the only GameState readers, `src/ui/*Rendering.ts` facades keep the historical entry points.
- The kit ships no default strings and no style literals: every label arrives through `UiEnv.t`, every color/font through the theme tokens. Sentinel tests fail on leaked literals in either direction.
- The reference for the kit is [docs/ui-kit.md](./docs/ui-kit.md); the migration history lives in [docs/ui-kit-inventory.md](./docs/ui-kit-inventory.md).

## Technical write-up

- [TECHNICAL.md](./TECHNICAL.md) is the technical overview of the project for developers outside the gaming industry (architecture, techniques, technologies, testing, deployment).
- Keep it accurate when you change anything it describes: the architecture/layering, core modules (`src/core/`, `src/game.ts`), state and persistence model, monster AI and Game Masters, rendering/lighting approach, i18n, auto-discovery (`import.meta.glob`), benchmarks, tooling, or the build/CI/deploy pipeline.
- The write-up describes components and techniques, not line numbers or exact counts — update it in the same change as the code; do not let it drift.
- New features at the level of the existing sections (e.g. a new rendering technique, a changed save format, a new benchmark capability) get a matching paragraph or section update.

## Content definition specs

- [docs/campaign-definition.md](./docs/campaign-definition.md),
  [docs/dungeon-definition.md](./docs/dungeon-definition.md) and
  [docs/gameMaster-definition.md](./docs/gameMaster-definition.md) are the
  field-by-field reference for the content definition types: the `Campaign`
  object and campaign folder structure, the `Dungeon` type with its
  `defineDungeon`/`defineLayout`/`parseTileMap` authoring DSL, win conditions
  and validation rules, and the `GameMaster` type (modifiers, director
  states, event hooks, lifecycle callbacks, id resolution).
- Update the campaign/dungeon specs in the same change as any edit to what
  they document: the `Campaign`, `Dungeon`, `Layout`, `WinCondition` and
  related types in `src/types.ts`; the declarative shorthand formats,
  defaults and parsing in `src/dungeon/dungeonParser.ts`; the structural
  rules in `src/dungeon/dungeonValidator.ts`; and the win-condition checks
  in `src/game.ts` or the registries they reference (`onCheckFulfilled`,
  `roomEffects`).
- Update the game-master spec in the same change as any edit to the
  `GameMaster` types in `src/types.ts`, the discovery/alias resolution in
  `src/gameMasters/index.ts`, or where the hooks are consumed (turn flow in
  `src/game.ts`, events in `src/events/EventsLogic.ts`, search in
  `src/secrets/SecretsLogic.ts`, combat in `src/core/combat.ts`, monster AI
  in `src/monsters/`).
- The specs list exact default values, tuple shorthands and validation
  rules — a changed default, an added/removed/reordered field or a new
  validation rule must be reflected there; do not let them drift from the
  code.
- [src/campaigns/README.md](./src/campaigns/README.md) and
  [src/gameMasters/README.md](./src/gameMasters/README.md) are the hands-on
  how-tos; when a documented authoring capability changes, update the spec
  and the matching README together, not just one of them.

## Code style

- Prettier with single quotes, 2-space indent, trailing commas (`npm run prettier:format`).
- ESLint is strict TypeScript: `no-console` and `no-explicit-any` are errors — use the logger in `src/core/logger.ts` and proper types.
- Prefer `import type` for type-only imports; relative imports within `src/` (except `$app/environment` and other SvelteKit aliases).
- Tests are colocated as `*.test.ts` next to the code they cover; add tests for any game-logic change.
- TypeScript is in strict mode (`tsconfig.json`) — no `any`, no unchecked assertions where avoidable.
