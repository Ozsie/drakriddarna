# 01 — Architecture

## Tech stack

| Concern       | Choice                                        | Notes                                                                                                                  |
| ------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Language      | Kotlin (latest stable)                        |                                                                                                                        |
| Framework     | Compose Multiplatform (JetBrains)             | Desktop only, JVM target. Use the official `compose.desktop` Gradle setup.                                             |
| Targets       | `jvm` only                                    | KMP structure is kept so iOS/Android could be added later, but v1 compiles for desktop only. Do not add other targets. |
| Serialization | `kotlinx.serialization` (JSON)                | Editor project file and catalogs.                                                                                      |
| Coroutines    | `kotlinx.coroutines`                          | File I/O, generation.                                                                                                  |
| File I/O      | `java.nio` in the desktop module              | Kept out of `core` via interfaces (below).                                                                             |
| Testing       | `kotlin.test` / JUnit 5                       | Golden-file tests for codegen (see 04, 08).                                                                            |
| Build         | Gradle version catalog (`libs.versions.toml`) |                                                                                                                        |

No other UI framework, no additional state-management library. Compose
state + an explicit `EditorStore` class is sufficient.

## Module layout

Two Gradle modules. The user sets up the base project; this is the target
layout:

```
editor/                        # KMP project root (separate repo/dir from the game)
  core/                       # Pure Kotlin, no Compose, no java.nio
    src/commonMain/kotlin/    # domain model, validation, codegen, project (de)serialization
    src/commonTest/kotlin/    # unit + golden-file tests
  app/                        # Compose Desktop application
    src/main/kotlin/          # UI, editor store, file system adapters
    src/main/resources/       # catalog.json, app icon
```

### `core` — the headless engine

Everything that must be testable without a UI lives here:

- Domain model (see 02).
- Validation (see 07).
- Code generation (see 04) — pure functions from domain objects to
  `String` file contents.
- Project file and catalog (de)serialization.
- Catalog reference resolution (item id -> module/export/index).

`core` must not import Compose, `java.awt`, `java.nio`, or any JVM-only API.
It compiles in `commonMain` so it can be reused if a mobile target is ever
added. File-system access is injected as an interface:

```kotlin
// core — consumed by app
interface FileSystem {
    fun read(path: String): String
    fun write(path: String, content: String)
    fun exists(path: String): Boolean
    fun list(path: String): List<String>
}
```

### `app` — the Compose Desktop UI

- Window, navigation, dungeon canvas, forms, validation panels.
- The single `FileSystem` implementation (`JavaFileSystem`) built on
  `java.nio`.
- Settings persistence (last opened campaign, window size) — store as JSON
  under `~/.drakriddarna-editor/settings.json` (or `System.getProperty("user.home")`).

## State management

One mutable store, one immutable document.

```kotlin
@Serializable
data class EditorProject(       // the whole campaign being edited (see 03)
    val campaign: CampaignDoc,
    val dungeons: List<DungeonDoc>,
    val translations: TranslationsDoc,
)

class EditorStore(
    private val fs: FileSystem,
) {
    var project: EditorProject         // immutable data class; replace on edit
        private set
    private val undoStack = ArrayDeque<EditorProject>()
    private val redoStack = ArrayDeque<EditorProject>()

    fun apply(mutate: (EditorProject) -> EditorProject) { ... }
    fun undo() { ... }
    fun redo() { ... }
    fun save() { ... }                 // writes campaign.editor.json
    fun generate(): GenerationResult { ... } // writes TS files, see 04
}
```

Rules:

- `EditorProject` is immutable; every edit produces a new instance
  (use `copy`). Compose observes a `mutableStateOf(project)` held by the store.
- **Undo/redo is snapshot-based**: push the pre-edit project onto the undo
  stack, cap at 100 entries, clear redo on new edit. No fine-grained command
  pattern — the domain is small enough that snapshots are simpler and
  unbreakable.
- Mark dirty state (`isDirty = undoDepthSinceSave > 0`) and warn on window
  close / campaign switch with a confirmation dialog.

## Error handling

- Generation and save failures (unwritable path, marker mismatch — see 03/04)
  are reported in the UI, never swallowed; log to a `GenerationResult.errors`
  list rendered in the generation panel.
- All user-visible errors surface as dialogs or inline validation — no silent
  `catch {}`.
- Never crash on a malformed project file: parse errors show a dialog offering
  to open the raw JSON or start a new project.

## Non-functional requirements

- Load-and-draw a 60x60 grid dungeon interactively (pan/zoom/repaint under
  16 ms per frame at reasonable zoom levels).
- Generation of a full campaign (< 10 dungeons) completes in well under a
  second and is deterministic byte-for-byte for identical input.
- The app is usable with a 1280x800 window.
