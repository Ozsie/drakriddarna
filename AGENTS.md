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

## Code style

- Prettier with single quotes, 2-space indent, trailing commas (`npm run prettier:format`).
- ESLint is strict TypeScript: `no-console` and `no-explicit-any` are errors — use the logger in `src/core/logger.ts` and proper types.
- Prefer `import type` for type-only imports; relative imports within `src/` (except `$app/environment` and other SvelteKit aliases).
- Tests are colocated as `*.test.ts` next to the code they cover; add tests for any game-logic change.
- TypeScript is in strict mode (`tsconfig.json`) — no `any`, no unchecked assertions where avoidable.
