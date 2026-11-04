# AGENTS.md

`@hoard-engine/primitives` — a HOARD engine package (spec:
`docs/engine-packages.md` in the game repo). The shared canvas drawing
layer — text measuring/wrapping/truncation, geometry, rounded-rect
clipping — plus the theme-token contract (`UiTheme`), its default values
and the deep-merge resolver.

## Commands

```bash
npm run build             # tsc declarations + esbuild ESM bundle to dist/
npm test                  # vitest (boundary, public-surface and unit tests)
npm run check             # tsc --noEmit (strict)
npm run lint               # eslint over src and vitest.config.ts
npm run prettier           # prettier check
npm run prettier:format    # prettier fix
```

Run `npm run check`, `npm test`, and `npm run lint` before considering
work done.

## Rules

- Dependency-free leaf: package sources use relative imports only — no
  game code, no Svelte, no i18n, no npm dependencies at runtime. The
  boundary test (`src/boundary.test.ts`) and lint enforce this.
- The public surface is `src/index.ts` only; every source module is
  re-exported there (completeness test `src/publicSurface.test.ts`).
- Game knowledge arrives as data: theme tokens, numeric sizes, plain
  strings. Nothing here may reference game types or content.
- The package must run in plain Node (tests are canvas-free; canvas
  contexts are passed in by consumers).
- While this package lives in the game repo under `packages/primitives/`,
  the root `check`, `lint` and `test` runs cover it too; publishing and
  removal from the repo follow the engine-package spec.
