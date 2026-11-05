# 07 — Lifting the kit into its own repository

**Status: done.** The kit is published as `@hoard-engine/uikit`
(v0.1.0, see [engine-packages.md](../engine-packages.md)) with the
export map, test split, rewiring and doc moves this plan prescribes;
`src/uikit/` has left this repo. The notes below are the original plan,
kept as the record of the decisions behind the lift.

M1–M6 are complete and the package-readiness gate in
[06-milestones.md](./06-milestones.md) is closed: nothing under
`src/uikit/**` imports game code (lint and boundary test), the public
surface is `src/uikit/index.ts` with a completeness test, every
component passes the independence test (hand-built view models only)
and the theme/translator sentinels, and the runtime code has zero
dependencies — its only non-relative imports are the test files'
`vitest`/`fs`/`path`. This document is the extraction plan: what remains
to move the kit to its own repository, the split of tests and docs, and
the decisions a human must make first. It is configuration work plus a
small number of split decisions — roughly a day of focused work.

## 1. Package scaffolding (the new repository)

- **`package.json`** — name, version, `type: module`, and the export map:

  | Export      | Target               | Why                                                                                                                                                                                                   |
  | ----------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `.`         | the built `index.ts` | The public surface; the completeness test proves it covers every symbol the game consumes.                                                                                                            |
  | `./testing` | `src/uikit/testing/` | **Required, not optional.** The game's parity and sentinel harness is built on `recordingContext`, `sentinelTheme` and `literalBudget`; without this subpath the consumer loses its verification net. |

- **Build** — the kit is plain TypeScript with no runtime or peer
  dependencies (the canvas API is ambient). Either a source publish
  (`tsc`) or a lib build (tsup/unbuild); both are one-file configs.
- **Tooling** — its own strict tsconfig (the current one minus the
  SvelteKit paths), prettier, and an eslint config porting the kit-side
  boundary rules (the `no-restricted-imports` patterns and the
  color-literal `no-restricted-syntax`, with the theme definition and
  literal-exercising tests exempt — see [05](./05-boundary-and-verification.md)).
  Type-checking becomes plain `tsc --noEmit` instead of svelte-check.

## 2. Test split

Eight of the kit's ten test files are fully self-contained and move with
it; two are consumer-side checks that stay with the game:

| Moves with the kit                                                                                                                                 | Stays in the game                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `boundary.test.ts`, `independence.test.ts`, the four `kit/*.test.ts`, `recordingContext.test.ts`, `sentinelTheme.test.ts`, `literalBudget.test.ts` | `publicSurface.test.ts` (walks `src/ui` + `src/components`; re-scoped after the lift to assert the game imports only through the package), the sentinel suites, the parity snapshots |

Port detail: `boundary.test.ts` uses a cwd-relative `'src/uikit'`
constant — make it module-relative (`import.meta.dirname`) so it is
cwd-independent.

## 3. Game-side rewiring

- Swap every deep import (`'../uikit/components/topBar'` and friends)
  for the package import; mechanical, and the completeness test
  guarantees nothing is missing from the surface.
- The reverse lint rule (logic modules cannot import the kit) stays in
  the game repo.
- The parity snapshots prove the game renders identically after the
  switch — run them before and after the import swap.

## 4. Docs

`docs/ui-kit.md` (the consumer reference) moves with the kit and needs
its game-repo paths rewritten. `docs/ui-kit-inventory.md` and this spec
stay with the game — they are this project's migration history. The
gallery decision from [06](./06-milestones.md) (a dev-only gallery route,
"theming is only convincing when seen") remains open and is best built in
the new repository once the next project exists.

## 5. Decisions to make before starting

- **Repo model** — separate repository vs. a workspace/monorepo shared
  with the game. A separate repo consumed via npm (or a git dependency)
  is simplest; a monorepo makes cross-repo changes cheaper during the
  transition.
- **Version flow** — after the lift, a game feature that needs a kit
  change becomes: package release, version bump, game update. The
  two-repo tax is real; decide whether the kit repository should host
  the next project from day one to keep the loop tight.
- **Publishing** — private vs. public npm package, the package name, and
  the CI/release process (the same check/test/lint scripts this repo
  already uses, minus Svelte).

## 6. Verification

The lift is done when: the kit's own suite passes standalone in the new
repository (boundary, independence, widgets, testing helpers); the game
passes its full suite — parity snapshots byte-identical — consuming the
package; and the game's re-scoped surface test proves every kit symbol
the game uses resolves through the package entry.
