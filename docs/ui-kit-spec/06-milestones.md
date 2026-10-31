# 06 — Milestones

Work the milestones strictly in order; each one's definition of done must be
satisfied before the next begins. The estimates assume someone who knows the
code and are derived from the original 4–8 week extraction analysis, not
measured. M1–M4 (about two weeks) deliver most of the theming and
de-duplication value on their own; stopping after any milestone is by design.

| Milestone | Deliverable                                                    | Exit criteria                                                                      | Estimate     |
| --------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------ |
| M1        | Inventory, recording context, parity snapshots, literal budget | Snapshots and inventory committed; CI green                                        | 2–3 days     |
| M2        | Theme and shared draw primitives                               | Literal budget 0 in converted modules; parity unchanged; second theme renders      | 3–5 days     |
| M3        | `UiEnv`/`UiContext`, translator and asset ports                | No i18n or `$lib` imports in converted modules; compact mode passed as a parameter | 2–3 days     |
| M4        | Component kit                                                  | Each primitive has at least two consumers and tests                                | about 1 week |
| M5        | View-model conversion of all in-scope renderers                | Each module moved to `src/uikit/components/` and clean                             | 2–3 weeks    |
| M6        | Hardening and package-readiness                                | Boundary lint is an error everywhere; docs updated; readiness checklist passes     | 2–3 days     |

## M1 — Inventory and safety net

Deliverables:

- Classify every renderer under `src/ui/`, `src/components/` and the domain
  folders as chrome (in scope) or world (out of scope).
- Write `docs/ui-kit-inventory.md`: per module, the `GameState` fields read,
  logic modules imported, `i18n()` calls, asset imports, style-literal
  count, and how input and hit-testing are coupled.
- Build the harness from
  [05-boundary-and-verification.md](./05-boundary-and-verification.md) and
  snapshot current behavior.
- Add the literal-budget test with today's number.

Definition of done: snapshots and inventory committed; CI green.

## M2 — Theme and primitives

Deliverables:

- Cluster literals into tokens; define `UiTheme`; make `defaultTheme` equal
  current values.
- Thread `theme` through renderers as an added parameter. Modules stay in
  `src/ui/`. Mechanical and low risk, one module per PR.
- Move `drawRoundedRect` and other repeated draw helpers into `primitives/`.
- Prove parameterization with a second theme (for example high contrast)
  through the sentinel test and a gallery.

Definition of done: literal budget 0 in converted modules; parity unchanged;
second theme renders.

## M3 — Context and ports

Deliverables:

- Introduce `UiEnv`/`UiContext`; the board controller builds them once per
  update.
- Replace `i18n()` imports with `env.t` and `$lib/*.png` imports with
  `AssetId`s resolved by `src/ui/assets.ts`.
- Replace width-derived compact detection inside layout functions with
  `env.mode`.
- Include env identity (locale, theme, mode) in render signatures so a
  locale or theme change repaints.

Definition of done: no i18n or `$lib` imports in converted modules; compact
mode passed as a parameter.

## M4 — Component kit

Deliverables: the primitives from
[04-kit-components.md](./04-kit-components.md), built only when a second
consumer exists.

Definition of done: each primitive has at least two consumers and tests.

## M5 — View-model conversion

Ordered by risk, easiest first, so the recipe is proven before the heavy
modules.

- **Tier A, leaf widgets**: top bar, hero card, monster card, compact-UI
  helpers.
- **Tier B, menus and dialogs**: welcome, settings, hero selection,
  save/load dialog, new-game dialog, canvas menu, dungeon intro.
- **Tier C, rule-heavy**: event card, diary, between-dungeons (with its
  `campaignComplete` and `partyWipe` steps and the high score list). These
  encode the most game rules. Split each into "decide what to show" (a
  game-side adapter tested with `GameState`) and "how to show it" (kit
  components). Between-dungeons becomes a union view model composed of
  generic parts (stat grid, table, action row) rather than one bespoke
  component.

Per-module recipe, one PR each:

1. Read the renderer and list exactly which fields it reads. Define the
   view model from that list.
2. Write the adapter and its tests against `GameState` fixtures.
3. Change the signature to `(vm, bounds, env/ctx, opts)`; replace inline
   layout with kit primitives where it is a 1:1 swap.
4. Make hit tests return semantic hits; add the mapping in `src/ui/actions/`.
5. Update the matching entries in `DungeonBoardUiHit` and
   `DungeonBoardSignatures` (signatures key on the view model).
6. Parity snapshots unchanged or deliberately updated; sentinel and
   independence tests pass; move the file into `src/uikit/components/`.

Definition of done: each module moved to `src/uikit/components/` and clean.

## M6 — Hardening

Deliverables:

- Boundary lint is an error across `src/uikit/**`; the reverse rule is on.
- `src/uikit/index.ts` exports a deliberate public surface.
- Write `docs/ui-kit.md` (tokens, view model reference, component contract)
  in the style of the existing content-definition specs; add an AGENTS.md
  section on the boundary; update the architecture and rendering sections
  of TECHNICAL.md.
- Run the readiness checklist below.

Definition of done: boundary lint is an error everywhere; docs updated;
readiness checklist passes.

## Policy and process

- **AI policy**: the kit ships no default strings. Fixtures and the gallery
  use existing translation keys. Any new label needs human-authored source
  text; AI may only translate it afterward.
- **Docs**: each milestone updates TECHNICAL.md where it changes
  architecture or rendering; `docs/ui-kit.md` and the inventory are
  maintained alongside the code.
- **Style**: strict TypeScript, no `any`, no `console` (use the logger),
  `import type`, colocated `*.test.ts`.
- **PRs**: one module or primitive per PR, with `npm run check`,
  `npm test` and `npm run lint` green on each.

## Package-readiness checklist

The decision gate for ever cutting the package:

- Zero imports from game code under `src/uikit/**`, enforced by lint and
  test.
- Sentinel theme and translator tests pass for every component.
- Every component is usable with hand-built view models.
- No `$lib`, Svelte or `sveltekit-i18n` imports in the kit.
- `docs/ui-kit.md` complete; public surface only through `index.ts`.
- Remaining work to publish is limited to the export map, build config,
  peer-dependency decisions and a separate test setup.

## Definition of done (whole effort)

- All in-scope renderers live in `src/uikit/components/` and take view
  models.
- The theme literal budget is zero; two themes exist (default and one
  alternate) and pass the sentinel test.
- Parity snapshots pass for the default theme.
- Boundary lint and test pass; readiness checklist complete.
- Docs updated; benchmark and full test suite green.

## Risks

| Risk                                           | Mitigation                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Consolidating primitives subtly changes pixels | Pixel comparison for M4 (open decision below); literal-only steps use exact call-log parity            |
| Kit becomes over-general                       | Two-consumer rule; options only on demand; theme slots only for a real second theme                    |
| Adapters misread state and change behavior     | Adapter tests on `GameState` fixtures; keep `ItemLogic`, `campaigns` and similar reads inside adapters |
| Stale visuals after a locale or theme change   | Env identity is part of render signatures; test switching locale mid-session                           |
| Long-lived refactor branch                     | One module per PR; trunk stays releasable; stop after any milestone                                    |
| Tier C modules dominate the schedule           | Do them last; split decide/show; deferring them still leaves a valuable kit                            |
| Future Svelte 5 upgrade                        | Kit is plain TS; only adapters touching stores are affected                                            |

## Open decisions

- **Pixel parity tooling (M4).** Recommendation: add a dev-only Node canvas
  (for example `@napi-rs/canvas`) so primitive consolidation can be verified
  by pixel diff. Alternative: manual visual review through a gallery.
- **Gallery.** A dev-only gallery route (guarded so it is absent from the
  production build) versus Vitest-only fixtures. Recommendation: the
  gallery, because theming is only convincing when seen.
- **Stopping point.** M1–M4 are independently valuable. Decide after M4
  whether Tier C of M5 is worth the cost.
