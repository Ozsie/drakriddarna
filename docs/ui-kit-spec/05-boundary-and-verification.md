# 05 — Boundary and Verification

The kit's independence is enforced by tooling, not convention: lint rules on
the import graph, a literal budget that may only decrease, a boundary test
walking the import graph, and a verification harness that proves parity and
the absence of leaked literals.

## Boundary enforcement

1. **Lint override** for `src/uikit/**` with `no-restricted-imports` covering
   `**/types`, `**/core/**`, `**/store/**`, `**/campaigns/**`, `**/game`,
   `**/items/**`, `**/saves/**`, `$lib/**`, `$app/**`, `svelte`,
   `svelte/*` and `sveltekit-i18n`. If the kit needs rect or grid math it
   owns its own in `primitives/geometry.ts`.
2. **Reverse rule**: logic modules (`src/game.ts`, `src/core/`, `src/monsters/`,
   and so on) may not import `src/uikit/**`, so the headless benchmark never
   pulls in canvas code.
3. **Literal budget**: a Vitest test counts color and font literals in
   `src/ui/**` against a stored number that may only go down. Under
   `src/uikit/**` a `no-restricted-syntax` rule on color-like string literals
   holds converted modules at zero.
4. **Boundary test**: a small test walks the import graph of `src/uikit/**`
   as a second line of defense, catching dynamic and re-exported paths that
   lint misses.

## Verification harness

Built in M1 and used by every later milestone.

- **Recording context**: a stub `CanvasRenderingContext2D` that logs method
  calls and property writes. Existing tests already stub contexts; this
  consolidates the pattern in `src/uikit/testing/`.
- **Parity snapshots**: each in-scope renderer runs against fixtures from
  real game states (early game, mid-campaign with injured heroes, compact
  mode, Swedish locale, overlays open) and its call log is snapshotted
  before any refactor. A step that only moves literals into the theme must
  produce an identical log. Intentional differences need an explicit
  snapshot update called out in the PR.
- **Sentinel theme**: every token is a unique marker value. Render each
  component and assert every color and font set on the context is a
  sentinel. A leftover literal fails.
- **Sentinel translator**: `t = key => '«' + key + '»'`. Assert every drawn
  string is wrapped or comes from a `literal` label. Hardcoded text fails.
- **Independence test**: components are exercised with hand-built view
  models only, never `GameState` fixtures.
- **Layout/hit consistency**: for every interactive region, hit-testing its
  center returns that region's hit, and the rect drawn is the rect tested.
- **Adapter tests**: `GameState` fixture in, view model out, asserted
  exactly. This is where game rules that used to hide inside renderers
  become testable.

Call-log snapshots are brittle against harmless reordering. That is fine for
literal-only changes. Primitive consolidation (M4) will legitimately change
the logs, so those steps use pixel comparison — see the open decision in
[06-milestones.md](./06-milestones.md).
