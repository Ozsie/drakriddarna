# 08 — Agent Guidelines

## Working assumptions

- The base KMP/Compose Desktop project scaffold exists (user-created). Work
  inside it; do not regenerate it. If the scaffold's module names differ from
  01 (`core`, `app`), adapt the code to the scaffold and note the deviation.
- The game repo (this repository) is the authority for every type and
  behaviour the editor must be compatible with. Read it before writing
  generators and validators; never trust the spec's quotes over the source.
- The editor is a separate application. Do not modify the game except for
  the catalog export script (03), which lives in `scripts/`.

## Build & test commands

```bash
./gradlew :core:allTests     # domain, validation, codegen (incl. golden files)
./gradlew :app:test          # UI/store tests where practical
./gradlew :app:run           # launch the desktop app
./gradlew build              # everything
```

In the game repo, generated output must be verified manually once per
generator change: `npm run check` and `npm run prettier` with the generated
files in place (see milestone M4).

## Coding conventions

- Kotlin official coding conventions (4-space indent), explicit types on
  public APIs, `data class` for all domain objects, `@Serializable` on
  everything in the project file model.
- Immutability everywhere in `core`; no global singletons.
- No Compose imports in `core`; no `java.*` imports in `core` (01).
- Compose UI: state hoisted to the screen level; composables stay dumb;
  avoid recomposition storms (stable models; the grid canvas draws via
  `Canvas` + explicit invalidation on state change, not per-frame
  animation loops).
- Tests colocated per module; golden files under
  `core/src/commonTest/resources/goldens/`.
- Commit messages imperative, one-line subject, and keep commits small and
  buildable.

## Milestones

Work strictly in order; each milestone ends with its definition of done
(DoD) satisfied before the next begins. Do not pre-build for later phases
("no speculative generality"): v1 has no GM editor, no TS import, no custom
code effects.

### M1 — Domain + project file

- Implement the 02 model in `core` with `@Serializable` types, defaults per
  02, project load/save (`formatVersion`, migrations skeleton, atomic save).
- Catalog model + a hand-written starter `catalog.json` from the current
  game content (items with import triples, monster types, enums).
- **DoD**: round-trip test `project -> JSON -> project` is identity for a
  fixture covering every entity kind; migration test for v0->v1 stub.

### M2 — Validation

- Implement 07 in `core` with stable finding codes.
- **DoD**: one unit test per finding code (green + red cases); the fixture
  from M1 validates clean.

### M3 — Code generation

- Implement 04: `campaign.ts`, `dungeons/<id>.ts`, translation JSONs,
  marker protocol, stale-file reporting, deterministic ordering.
- **DoD**: golden-file tests pass byte-for-byte; generator is a pure
  function of (project, catalog); manual `npm run check` +
  `npm run prettier` in a scratch copy of the game repo with generated files
  in place, plus the campaign appears in the game's campaign list (verified
  once by the user or agent running `npm run dev`).

### M4 — App shell + campaign section

- Compose window, EditorStore with snapshot undo/redo (01), open/save/new
  project, campaign section forms (06), generation panel.
- **DoD**: create a new project, fill campaign metadata, save, generate,
  and the output is M3-equivalent; undo/redo and dirty-state close
  warning work.

### M5 — Dungeon editor

- Grid canvas, tools, inspector, chaining panel per 05.
- **DoD**: recreate a small dungeon (2 rooms, 1 corridor, 2 doors incl. one
  hidden, 3 monsters, 1 secret, 1 note, 2 lights, 4 starting positions,
  win conditions) entirely through the UI; generation output matches the
  same dungeon authored by hand in the fixture.

### M6 — Translations editor

- Key inventory derivation, matrix UI, filters, validation per 06/07.
- **DoD**: all derived keys manageable end-to-end; missing-translation
  generation blocking works; en/sv JSON output nested correctly.

### M7 — Catalog refresh + polish

- `scripts/export-editor-catalog.ts` in the game repo; editor refresh
  command; stale-ref errors; final keyboard shortcut pass; crash-free
  malformed-project handling.
- **DoD**: catalog regenerated from the real game repo replaces the
  starter catalog without breaking the fixture project (ids match);
  documented limitations section in the editor's README.

### Phase 2 — Game Master editor (design: 09)

Do not start before M7 is done. Read
[09-game-master-editor.md](./09-game-master-editor.md) first; it reuses
the M1–M4 infrastructure and adds a second document kind.

### M8 — GM domain + codegen

- `GameMasterDoc` model, `gameMaster.editor.json` project file (second
  document kind in the open/save/new flow), GM generator with the
  director-policy DSL, `behaviorTagWeights`, `initialState`, and the
  raw-code escape hatch per 09.
- **DoD**: golden files pass; fixtures equivalent to `tactician` and
  `brutalOverlord` generate semantically-identical logic to the built-ins;
  generation into a scratch copy of the game repo passes `npm run check`
  and the GM appears in the game's GM list.

### M9 — GM editor UI

- Form editor per 09: identity + translations, modifiers, monster
  behaviour with rule list and simulation strip, events, starting
  equipment, advanced raw-TS section; validation findings wired in.
- **DoD**: build both `tactician` and `brutalOverlord` equivalents entirely
  through the UI; director simulation strip matches the built-ins' pacing
  decisions on the fixture context grid; all 09 validation rules have
  green/red tests.

### M10 — GM integration polish

- Shared-translation merge safety (multiple GMs writing the same
  `translations/en.json`), stale-file reporting for GM folders, catalog
  coverage for starting-equipment refs.
- **DoD**: two GM projects coexist in one game repo without clobbering each
  other's translation keys; documented limitations updated.

## Definition of done (every milestone)

- `./gradlew build` green.
- No `TODO`/`FIXME` left in shipped code from the milestone scope.
- New behaviours covered by tests; golden files regenerated via the test
  helper when intentionally changed.
- One-paragraph summary of what changed committed with the milestone.

## Explicit non-goals to respect during implementation

- Do not generate `interactables` with effects absent from the catalog.
- Do not emit `corners` (auto-derived), `beaten`, `killCount` runtime fields,
  or any `fulfilled: true`.
- Do not write outside the campaign folder. Ever.
- Do not attempt TS parsing/round-trip import in v1 (03).
- Do not add game-engine changes to make generation easier — the constraint
  is output compatibility with the engine as it exists.
