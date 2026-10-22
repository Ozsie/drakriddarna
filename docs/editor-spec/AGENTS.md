# Drakriddarna Campaign Editor

A Kotlin Multiplatform desktop application (Compose Multiplatform, JVM
target only) for authoring campaigns for the Drakriddarna game. It edits a
project file and **generates TypeScript campaign modules** that the game
auto-discovers — the game engine is never modified.

## Specification

The full spec lives in [`docs/editor-spec/`](./docs/editor-spec/). It is
authoritative for architecture, domain model, code generation, UX, and
validation.

Read it in this order before writing any code:

1. `docs/editor-spec/README.md` — scope, decisions already made
2. `01-architecture.md` through `07-validation.md`
3. `08-agent-guidelines.md` — milestones, conventions, definition of done

Where the spec and the game source disagree, **the game source wins**. The
spec's type quotes are conveniences that can go stale.

## Game repository

The Drakriddarna game repo lives at:

```
/Users/oscar/dev/drakriddarna
```

- Authoritative types: `src/types.ts`, declarative dungeon helpers:
  `src/dungeon/dungeonParser.ts`, validator: `src/dungeon/dungeonValidator.ts`,
  reference campaign: `src/campaigns/iceDragonTreasure/`.
- The editor must not modify the game repo, with one exception: the catalog
  export script `scripts/export-editor-catalog.ts` (see
  `docs/editor-spec/03-project-format.md`).

## Module layout

- `core` — pure Kotlin: domain model, validation, code generation, project
  file (de)serialization. **No Compose and no `java.*` imports here.** Must
  compile in `commonMain`.
- `app` — Compose Desktop UI, the only module that touches the file system
  (via the `FileSystem` interface defined in `core`).

## Commands

```bash
./gradlew :core:allTests   # domain, validation, codegen tests (incl. golden files)
./gradlew :app:run         # launch the desktop app
./gradlew build            # everything
```

## Non-negotiable rules

- `campaign.editor.json` is the source of truth. Generated TS files are
  output only — never parse them back or treat them as input.
- Every generated file starts with the `// GENERATED FILE - DO NOT EDIT.`
  marker; the generator never overwrites a file lacking the marker without
  an explicit forced confirmation.
- Code generation is deterministic: identical project input produces
  byte-identical output. Golden-file tests must pass exactly.
- The editor writes only inside the chosen campaign folder.
- No game-engine changes to make generation easier.
- v1 scope: dungeon layout editor, campaign metadata, translation editor
  (milestones M1–M7). Game Master editor is phase 2, fully spec'ed in
  `docs/editor-spec/09-game-master-editor.md` (milestones M8–M10) — do not
  start it before M7. No TS import, no custom code-defined campaign
  effects (the GM raw-code escape hatch in 09 is the one sanctioned
  exception).

## Working discipline

Work through the milestones M1–M7 in `08-agent-guidelines.md` strictly in
order; each milestone's definition of done must be satisfied before the next
begins. Do not pre-build for later phases.

Kotlin official coding conventions, immutable data classes in `core`,
snapshot-based undo/redo, explicit test coverage for every validation rule
and generator template.
