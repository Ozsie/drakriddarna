# Codebase navigation plan

Goal: make the codebase easy to navigate for a human returning after two
years, and for AI assistants working in it. Ordered by leverage per hour of
effort. Each phase can be done as one or more small, self-contained commits —
run `npm run check && npm test && npm run lint` after every step.

Ground rules (apply to every phase):

- Comments explain *why* and *what a thing is for*, never restate the code.
- No changes to game behavior, game text, or content — this is documentation
  and structure only. The AI policy in AGENTS.md applies: no AI-authored
  in-game text.
- Prefer deleting or merging over adding when two things describe the same
  concept.
- Do not let TECHNICAL.md or the docs/*-definition.md specs drift — if a
  phase touches something they describe, update them in the same change.

## Current state (what to build on)

Strengths that already exist:

- AGENTS.md, TECHNICAL.md, RULES.md and docs/*-definition.md give a good
  top-level map.
- File naming already encodes role: `*Logic.ts` (game rules), `*Rendering.ts`
  (canvas drawing), `*Controller.ts` (input wiring), `*.test.ts` colocated.
- Recent files (`src/core/timer.ts`, `src/core/scoring.ts`,
  `src/core/ImageCache.ts`) show the target header-comment style: a short
  block at the top stating responsibility, key collaborators, and where the
  thing is consumed.
- TODO.md is a well-kept ledger of known quirks.

Gaps:

- ~120 source files; only a handful have header comments.
- No per-directory READMEs (only campaigns/ and gameMasters/ have them).
- A few very large files dominate the scary-file list:
  `src/components/DungeonBoardController.ts` (2596 lines),
  `src/dungeon/LightRendering.ts` (2085),
  `src/dungeon/DungeonRendering.ts` (1789),
  `src/ui/BetweenDungeonsRendering.ts` (1235),
  `src/dungeon/dungeonParser.ts` (997),
  `src/monsters/MonsterLogic.ts` (977),
  `src/types.ts` (953),
  `src/events/EventsLogic.ts` (890).
- `src/types.ts` is the domain glossary but most types carry no doc comment.

## Phase 1 — Conventions (half a day)

1. Write the header-comment convention down in AGENTS.md so both humans and
   AI apply it consistently: every non-test source file starts with a 2–8 line
   `/** */` TSDoc block — what the module is responsible for, its main
   collaborators, and who consumes it. Use `src/core/timer.ts` as the
   reference example.
2. Document the file-naming suffix convention (`*Logic`, `*Rendering`,
   `*Controller`, `*Store`, `*.test.ts`) in AGENTS.md, one line each.
3. Add a directory map table to TECHNICAL.md (or a short `src/README.md`):
   one row per top-level `src/` directory, one sentence each. This table is
   the quick "where do I find X" index — do **not** create a separate
   ARCHITECTURE.md: TECHNICAL.md is the single architecture description
   (AGENTS.md already requires keeping it current), and this plan's
   directory map, READMEs and turn-flow walkthrough cover the navigational
   layer. A second architecture doc would only duplicate it and drift.

## Phase 2 — Directory READMEs (1–2 days, highest leverage)

Add a short `README.md` to each `src/` subdirectory that lacks one:

`core`, `dungeon`, `ui`, `components`, `hero`, `monsters`, `combat`,
`events`, `items`, `interactables`, `secrets`, `input`, `store`, `saves`,
`audio`, `menu`, `notes`, `benchmark`, `routes`, `lib`.

Each README: 5–15 lines — the directory's purpose, the 2–4 files that matter
most, what flows in and out, and pointers to the relevant spec in
`docs/` or TECHNICAL.md. Model them on the existing
`src/campaigns/README.md`. This is the single biggest navigation win per hour
spent: it is the map a returning human (or a fresh AI session) reads first.

## Phase 3 — Limited TSDoc on the exported surface (2–4 days, mechanical)

Sweep doc comments over all non-test source files, in this priority order:

1. `src/game.ts` and `src/types.ts` — the hub and the glossary.
2. `src/core/*` — shared primitives everything else leans on.
3. Domain logic: `hero/`, `monsters/`, `combat/`, `events/`, `items/`,
   `interactables/`, `secrets/`, `dungeon/` (logic files).
4. Rendering and UI: `dungeon/` (rendering files), `ui/`, `components/`,
   `menu/`, `input/`, `store/`, `saves/`, `audio/`.
5. `benchmark/`, `scripts/`, and anything left.

For `src/types.ts` specifically: give every exported interface and union a
one-to-three-line doc comment. It is the fastest way to make the domain model
legible, and it pays off in every IDE tooltip from then on.

Conventions for this phase — limited TSDoc, only what TypeDoc and the IDE can
actually use:

- Write `/** */` doc comments (TSDoc syntax) on exported symbols only:
  a module-level block at the top of each file, and a short description on
  each exported type and function. Skip internal helpers and test files.
- The description prose is the point. TypeScript already documents parameter
  and return shapes, so do **not** add `@param`/`@returns` unless the tag
  says something the signature cannot (e.g. units, invariants, side effects).
- Use `@see` to point at RULES.md and the docs/*-definition.md specs instead
  of duplicating what they say — those specs remain the authority for content
  authors.
- Use `{@link}` sparingly, only where a cross-reference genuinely helps
  (e.g. from a type to the module that owns its lifecycle). Every `{@link}`
  is a CI-checked contract once TypeDoc runs in phase 6.
- Optional: `@category` on module headers to group the generated site's
  sidebar by area (core, dungeon, combat, rendering, ...).
- No examples blocks, no `@remarks` essays. If a concept needs a paragraph,
  it belongs in the directory README or a spec, not the doc comment.

Do one directory per commit. This phase is ideal to delegate to AI sessions —
it is mechanical, verifiable, and low-risk.

## Phase 4 — Turn-flow walkthrough (half a day)

`src/game.ts` is the hub but reads as a wall of imports and functions. Add a
comment walkthrough at the top: the shape of one hero turn and one monster
turn, which functions own which phase, and where win conditions, saves, and
the timer hook in. Cross-link from TECHNICAL.md's architecture section. This
is the "if you only read one file, read this" anchor for the whole codebase.

## Phase 5 — Tame the giant files (optional, do last)

Only after phases 1–4, because understanding must precede moving code:

1. For each giant file, add a table-of-contents comment at the top listing its
   internal sections, and section-marker comments at each seam. Cheap, and
   often makes splitting unnecessary.
2. Split only where a seam is already obvious and tests cover the behavior —
   one file per PR, tests green before and after. Candidates in order:
   `DungeonBoardController.ts` (input handling vs. orchestration),
   `LightRendering.ts` (light computation vs. drawing), `DungeonRendering.ts`
   (layers).
3. Do not reorganize directories wholesale. The current layout is sound; a
   big-bang move would break the auto-discovery globs, the docs, and every
   AI session's mental map at once.

## Phase 6 — Generated API reference (optional)

- Add TypeDoc (`npm run docs`): generates a static, cross-linked HTML
  reference from the TSDoc comments and TypeScript types. Deploy it alongside
  the game (a `/docs` folder in the static build) or as a separate docs
  build if the API reference should not be public.
- Configure TypeDoc entry points as the real module files, not barrel
  exports like `src/core/index.ts` — barrels produce duplicate pages for
  every re-exported symbol.
- Add `eslint-plugin-tsdoc` so malformed TSDoc comments fail lint, keeping
  the limited-tag convention enforceable.
- Wire the docs build into CI so broken `{@link}` references fail fast.
- The generated reference documents signatures, not architecture — it
  complements the directory READMEs and the turn-flow walkthrough, and does
  not replace them.

## Phase 7 — Guardrails (optional)

- A small `scripts/check-file-headers.ts` (run in CI) that fails if a
  non-test source file lacks a header comment — keeps the convention from
  eroding. Generate nothing by hand; keep it a plain lint-style script.
- Keep TODO.md as the quirks ledger; when a header comment would explain a
  known oddity, link to the TODO entry instead of duplicating it.

## Suggested working loop

One directory (or one giant file) per session, in phase order. After each
session: `npm run check && npm test && npm run lint`, then commit. The plan
is deliberately incremental — every finished step leaves the codebase better
than the last, so it can be paused at any point.
