# Campaign Editor — Specification & Agent Guidelines

This folder contains the complete specification for **Drakriddarna Campaign
Editor**: a Kotlin Multiplatform (KMP) desktop application for authoring
campaigns for the Drakriddarna web game in this repository.

The editor's job is to replace hand-writing the TypeScript campaign modules
under `src/campaigns/<id>/` with a visual tool that:

1. Lets the author draw dungeon layouts (grid, rooms, corridors, doors,
   monsters, lights, secrets, items, notes, interactables, pits, pillars,
   starting positions).
2. Edits campaign metadata (id, name, heroes, dungeon chain, item decks,
   tilesets, per-dungeon win conditions and events).
3. Manages English/Swedish translation keys and validates them against the
   campaign content.
4. **Generates the TypeScript modules** that the game auto-discovers via
   `import.meta.glob` — no changes to the game engine are required.

## Scope decisions (already made — do not relitigate)

| Decision | Choice |
|---|---|
| Platform | KMP, desktop only (Compose Multiplatform, JVM target) |
| Output format | Generated TypeScript modules, drop-in compatible with the existing game |
| v1 features | Dungeon layout editor, campaign metadata, translation editor |
| Phase 2 | Game Master editor — fully spec'ed in [09-game-master-editor.md](./09-game-master-editor.md); depends on M1–M4 infrastructure, builds after M7 |
| v1 non-goals | Custom code-defined items/events/monster behaviours, editing existing hand-authored campaigns (import only, see 03) |
| Game repo changes | None. The editor only reads the game repo and writes into campaign folders. |

### Future phases (out of scope for v1)

- **Game Master editor** — designed in
  [09-game-master-editor.md](./09-game-master-editor.md); scheduled as
  milestones M8–M10 (08) after the campaign editor (M1–M7) ships.
- **Import of hand-authored campaigns** — a parser for existing
  `defineDungeon({...})` literals (see 03).
- Custom item/event/monster effects (these require code, which the editor
  cannot generate). The GM editor's raw-code escape hatch (09) is the
  deliberate exception for Game Master hooks only.

## Reading order

| Doc | Contents |
|---|---|
| [01-architecture.md](./01-architecture.md) | Tech stack, module layout, state management, undo/redo, file I/O |
| [02-domain-model.md](./02-domain-model.md) | The editor's domain model and its exact mapping to game types; grid semantics; enums |
| [03-project-format.md](./03-project-format.md) | The editor project file (`campaign.editor.json`), source-of-truth policy, the shared-content catalog |
| [04-code-generation.md](./04-code-generation.md) | Exact code-generation contract: files emitted, templates, style, idempotency |
| [05-dungeon-editor.md](./05-dungeon-editor.md) | Visual dungeon layout editor UX spec |
| [06-campaign-editor.md](./06-campaign-editor.md) | Campaign metadata + translation editor UX spec |
| [07-validation.md](./07-validation.md) | Validation rules (port of the game's `dungeonValidator.ts`) and translation checks |
| [08-agent-guidelines.md](./08-agent-guidelines.md) | Build/test commands, coding conventions, phased milestones, definition of done |
| [09-game-master-editor.md](./09-game-master-editor.md) | Phase 2 design: Game Master data-vs-code split, director policy DSL, codegen, UI, validation |

## How to brief an agent

Give the agent this folder as its specification and tell it:

- The base KMP project scaffold already exists (user sets it up); do not
  regenerate it, work within the module layout in 01.
- Read docs in the numbered order before writing code.
- Work milestone by milestone (08); each milestone has an explicit definition
  of done including tests.
- The game repository is at hand: the authoritative type definitions are
  `src/types.ts`, the declarative dungeon helpers are
  `src/dungeon/dungeonParser.ts`, and the reference campaign is
  `src/campaigns/iceDragonTreasure/`. When the spec and the game source
  disagree, the game source wins — the generated code must compile and pass
  `npm run check` and `npm run prettier` in the game repo.
- Docs 02–04 quote the game types for convenience, but quotes can go stale.
  Verify against the game source before implementing a generator or validator
  rule.

## Glossary

- **Game repo** — this repository (the SvelteKit game).
- **Campaign folder** — `src/campaigns/<campaignId>/` in the game repo.
- **Editor project file** — `campaign.editor.json`, the editor's
  source-of-truth document inside the campaign folder (see 03).
- **Generated files** — `campaign.ts`, `dungeons/*.ts`,
  `translations/{en,sv}.json` written by the editor's code generator.
- **Catalog** — a JSON snapshot of the game's shared content (items, monster
  types, enums) used by the editor to populate pickers and resolve references
  (see 03).
- **Grid** — the ASCII dungeon layout; `' '`, `'#'`, `?` and room letters
  (see 02).
