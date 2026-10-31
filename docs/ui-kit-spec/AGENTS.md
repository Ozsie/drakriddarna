# Drakriddarna In-Project UI Kit

A parameterized canvas UI kit built in place: shared primitives, a theme
token object, view models and a UI context under `src/uikit/`, with
game-specific knowledge pushed into a thin adapter layer in `src/ui/`.
No behavior change — the default theme reproduces today's pixels exactly.
No package is published; the kit is _package-ready_ when the boundary lint
proves nothing under `src/uikit/` imports game code.

## Specification

The full spec lives in [`docs/ui-kit-spec/`](./). It is authoritative for
the module layout, the component contract, theming, boundary enforcement
and the milestones.

Read it in this order before writing any code:

1. `README.md` — scope, decisions already made
2. `01-architecture.md` — goals, constraints, module layout, performance
3. `02-component-contract.md` — `UiEnv`/`UiContext`, the layout/hit/render
   contract, view models
4. `03-theme-and-parameterization.md` — theme tokens, the three channels
5. `04-kit-components.md` — primitive catalog, input and hit testing
6. `05-boundary-and-verification.md` — lint rules, literal budget, the
   verification harness
7. `06-milestones.md` — M1–M6 with definitions of done, conversion recipe

Where the spec and the game source disagree, **the game source wins**
(`src/ui/` and `src/components/` for renderers, the board controller,
signatures and the hit cascade; `src/types.ts` for `GameState`; `src/core/`
for the `i18n` re-export and `ImageCache`; `src/store/` for the game and
radial-menu stores; `src/menu/MenuLogic.ts` for menu items and callbacks).

## Repository layout

- New kit code: `src/uikit/` (`theme/`, `env.ts`, `primitives/`, `kit/`,
  `components/`, `testing/`, `index.ts`).
- New game-side glue: `src/ui/viewmodels/` (adapters), `src/ui/actions/`
  (semantic hit to game action mapping), `src/ui/assets.ts` (the only
  `$lib/*.png` imports), `src/ui/i18nAdapter.ts`, `src/ui/theme.ts`.
- Existing renderers are converted in place, one module per PR;
  `DungeonBoardController.ts`, `DungeonBoardSignatures.ts` and
  `DungeonBoardUiHit.ts` keep working throughout.
- Docs maintained alongside the code: `docs/ui-kit-inventory.md` (from M1),
  `docs/ui-kit.md` (from M6), TECHNICAL.md per milestone.

## AI policy

Per the project AI Policy (see the repo `README.md`): AI tools are used to
produce, test, and review code, and to create translations of in-game
texts. AI must not be used to produce art, music, source in-game texts,
campaigns, dungeons, or other game content.

For this spec that means: AI builds, tests, and reviews the kit, adapters
and tests. The kit ships **zero default strings** — fixtures and the gallery
reuse existing translation keys. Any new user-facing label is authored by a
human in at least one language first; once a text exists in one language, AI
may create the translation into the other language (`en`/`sv`). Player-typed
text (renamed heroes, save names, seeds) is user content — pass it through
as `{ literal }` labels, never generate or correct it.

## Non-negotiable rules

- Nothing under `src/uikit/**` imports game code: `../types`, `src/core/**`,
  stores, `src/campaigns/**`, `src/game`, `$lib/**`, `$app/**`, `svelte`,
  `sveltekit-i18n` — enforced by lint, the literal budget and the boundary
  test (05). The reverse rule also holds: logic modules never import the
  kit, so the headless benchmark never pulls in canvas code.
- Renderers take `(view model, bounds, env/context, options)`. `GameState`
  and logic reads (`ItemLogic`, `campaigns`, `MenuLogic`, …) happen only in
  adapters under `src/ui/viewmodels/`, tested against `GameState` fixtures.
- Default-theme pixel parity. Intentional visual differences need an
  explicit parity-snapshot update called out in the PR.
- All user-facing strings in both `en` and `sv` via sveltekit-i18n; no
  hardcoded text; the kit ships no strings.
- Strict TypeScript, no `any`, no `console` (use the logger in
  `src/core/logger.ts`), `import type`, colocated `*.test.ts`, prettier
  single quotes and 2-space indent.
- No speculative generality: two-consumer rule for primitives, options only
  when a call site needs one, per-component theme slots only for a real
  second theme.
- Do not build the non-goals unasked: publishing a package, world-rendering
  conversion, a DOM/ARIA mirror, a Svelte 5 upgrade, any visual redesign.

## Working discipline

Work through the milestones M1–M6 in `06-milestones.md` strictly in order;
each milestone's definition of done must be satisfied before the next
begins. One module or primitive per PR, with `npm run check`, `npm test`,
`npm run lint` and `npm run prettier` green on each. Stopping after any
milestone is by design; M1–M4 are independently valuable, and whether M5's
Tier C is worth the cost is decided after M4.
