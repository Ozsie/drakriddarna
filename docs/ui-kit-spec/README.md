# In-Project UI Kit — Specification & Agent Guidelines

This folder contains the complete specification for building a
**parameterized canvas UI kit inside the repository** (`src/uikit/`):
shared primitives, a theme token object, view models and a UI context, so
that the game's HUD, menu and dialog renderers stop reading `GameState`,
calling `i18n()`, importing Vite asset URLs and hardcoding colors and fonts.
Game-specific knowledge moves into a thin adapter layer in `src/ui/`. The
package boundary is **not** cut; the kit is *package-ready* when nothing
under `src/uikit/` imports from game code and a lint rule proves it.

## Scope decisions (already made — do not relitigate)

| Decision                | Choice                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Extraction vs in place  | In place. The kit is built inside the repo; publishing and versioning are non-goals. Package-readiness is a checklist (06), not a phase of cutting a package                                  |
| Scope line              | Chrome only: HUD, cards, menus, dialogs, overlays. World rendering (tiles, lighting, fog, terrain, actors, particles) stays where it is. Hero and monster cards are UI and move out of the domain folders (`hero/`, `monsters/`) into `src/uikit/components/` |
| Location and name       | A separate top-level folder `src/uikit/`, so the lint override and any later extraction are trivial                                                                                          |
| Data contract           | Renderers take a view model (what to show), a theme (how it looks) and a UI context (translator, assets, layout mode) — never `GameState`                                                     |
| Styling                 | One theme token object; `defaultTheme` reproduces today's pixels exactly; per-component theme slots only when a real second theme needs one                                                  |
| Parameterization        | Three channels with one rule each: theme (visual and global), options (per-instance structural), view model (data) — see 03                                                                   |
| Behavior change         | None. Pixel parity with the default theme; intentional differences need an explicit parity-snapshot update called out in the PR                                                               |
| Boundary                | Enforced by lint and tests (restricted imports, reverse rule, literal budget, boundary test), not by convention — see 05                                                                     |
| Verification            | Recording-context parity snapshots against real game-state fixtures, taken in M1 before any refactor — see 05                                                                                |
| Input                   | Components return semantic hits; the hit-to-behavior mapping lives in `src/ui/actions/`, the only place UI calls game logic                                                                  |
| New text and art        | None. The kit ships zero default strings (AI policy)                                                                                                                                       |
| Non-goals               | Publishing a package; world rendering; a DOM/ARIA accessibility mirror; a Svelte 5 / SvelteKit upgrade; any visual redesign                                                                 |

### Rationale for the two biggest calls

**Build the kit in place, do not extract a package first.** The renderers are
not componentized: nearly every one takes `GameState` directly, calls
`i18n()`, and hardcodes its own layout inline. Extracting first would
produce a package only this game can use. Building the kit in place keeps
the game green at every step, makes each conversion a small reviewable
change, and lets the work stop after any milestone with the value already
banked. Cutting the package later is then a mechanical step guarded by the
readiness checklist.

**View models instead of passing `GameState`.** Today's renderers read game
state deep inside their drawing code, so game rules hide where they cannot
be tested. Moving the reads into adapters (`src/ui/viewmodels/`) splits
"decide what to show" (a game-side function tested against `GameState`
fixtures) from "how to show it" (a kit component tested with hand-built view
models). View models are plain comparable data, which also makes them
usable in dirty-check render signatures.

## Reading order

| Doc                                                            | Contents                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [01-architecture.md](./01-architecture.md)                     | Goals and non-goals, inherited constraints, module layout, dependency direction, performance  |
| [02-component-contract.md](./02-component-contract.md)         | `UiEnv`/`UiContext`, translator and asset ports, the layout/hit/render contract, view models  |
| [03-theme-and-parameterization.md](./03-theme-and-parameterization.md) | Theme tokens, `defaultTheme`, `resolveTheme`, the three parameterization channels, compact mode |
| [04-kit-components.md](./04-kit-components.md)                 | The primitive catalog with proving consumers, the two-consumer rule, input and hit testing     |
| [05-boundary-and-verification.md](./05-boundary-and-verification.md) | Boundary lint rules, literal budget, boundary test, the verification harness                 |
| [06-milestones.md](./06-milestones.md)                         | M1–M6 with deliverables and definitions of done, the conversion recipe, risks, open decisions |

## How to brief an agent

Give the agent this folder as its specification and tell it:

- The game repository is the authority for every surface the spec
  references: `src/ui/` and `src/components/` (renderers, board controller,
  signatures, hit cascade), `src/types.ts` (`GameState`), `src/core/`
  (`i18n` re-export, `ImageCache`), `src/store/` (game and radial-menu
  stores), `src/menu/MenuLogic.ts` and `src/lib/translations/`. Where the
  spec and the game source disagree, the game source wins.
- Read the docs in numbered order before writing code.
- Work milestone by milestone (06); each milestone has an explicit
  definition of done including tests.
- Parity comes first: M1 snapshots today's behavior before anything changes;
  a literal-only step must produce an identical call log.
- Obey the repo's existing constraints: strict TypeScript (no `any`, no
  `console` — use the logger in `src/core/logger.ts`), colocated
  `*.test.ts`, prettier single quotes / 2-space indent, every user-facing
  string in both `en` and `sv` via sveltekit-i18n.
- The kit ships no default strings: fixtures and the gallery reuse existing
  translation keys. Any new user-facing label is authored by a human in at
  least one language first; AI may only translate it afterward.
- Run `npm run check`, `npm test`, `npm run lint` and `npm run prettier`
  before considering work done.

## Glossary

- **Kit** — `src/uikit/`, the game-agnostic canvas UI code: theme,
  primitives, kit widgets, components and testing helpers.
- **Adapter layer** — the game side (`src/ui/viewmodels/`, `actions/`,
  `assets.ts`, `i18nAdapter.ts`, `theme.ts`); the only UI-adjacent code
  allowed to read game types.
- **Chrome** — in-scope UI: HUD, cards, menus, dialogs, overlays.
  **World** — out-of-scope rendering: tiles, lighting, fog, terrain,
  actors, particles.
- **View model** — plain readonly data describing what a component shows;
  built by an adapter from `GameState`.
- **Theme** — the token object (`UiTheme`) carrying all colors, fonts,
  spacing, radii and opacities; `defaultTheme` equals today's literals.
- **`UiEnv` / `UiContext`** — what a pure layout function needs (theme,
  mode, translator, text measure) / what a render function needs (env plus
  canvas and assets).
- **`Label`** — a translated-or-literal text value: `{ key, params? }` or
  `{ literal }`.
- **`AssetId`** — an opaque image identifier resolved by the game-side asset
  provider; the kit never sees a URL.
- **Semantic hit** — `{ kind, id }` data returned by a component's hit
  test, mapped to behavior in `src/ui/actions/`.
- **Sentinel theme / sentinel translator** — test doubles whose every token
  or string is a unique marker, proving no literal leaks into rendering.
- **Parity snapshot** — a recording-context call log for a renderer against
  a fixed game-state fixture; must stay identical for literal-only changes.
- **Literal budget** — the stored count of color and font literals in
  `src/ui/**`, which may only go down.
- **Two-consumer rule** — a kit primitive is built only when a second
  consumer exists.

## Basis of this spec

Written from the repository's README, TECHNICAL.md and AGENTS.md, plus an
extraction analysis of the canvas UI. The counts it cites (35 `../types`
imports, 99 `fillStyle` literals, 10 font literals, about 4,900 LOC of
canvas renderers) come from that analysis and were not re-verified. The
`HeroCardViewModel` in 02 is illustrative. M1 replaces all of this with a
real inventory.
