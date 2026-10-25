# 07 — Validation

Validation runs live (on every project mutation) and before generation.
Every rule produces an error or warning with a message, a location
(campaign / dungeon / position when applicable), and a click-through target.

Rules marked **[blocking]** prevent generation; **[warning]** shows in the
panel and on the canvas but allows generation.

## Ported from the game's `dungeonValidator.ts`

The game already validates dungeons at definition time (`defineDungeon` with
`validate: true` — `src/dungeon/dungeonValidator.ts`). The editor implements
the same rules **before** generation so the author never generates a dungeon
the game would reject:

| Rule                                                                                                            | Severity | Source            |
| --------------------------------------------------------------------------------------------------------------- | -------- | ----------------- |
| Grid not empty; rectangular (all rows equal length)                                                             | Blocking | `grid` checks     |
| Any placed entity (start pos, monster, secret, note, item, interactable, light, pit, pillar) out of grid bounds | Blocking | `boundary`        |
| Entity placed on a wall `#` or void ` ` cell                                                                    | Blocking | `overlap`         |
| Door out of bounds; door on a void cell                                                                         | Blocking | `door`/`boundary` |
| Door side not in `Up/Down/Left/Right`                                                                           | Blocking | `door`            |
| Duplicate ids among monsters/doors/secrets/interactables/lights                                                 | Blocking | `duplicate_id`    |
| `REACH_CELL` target inside grid (and not wall/void); other win-condition `targetCell` in bounds                 | Blocking | `condition`       |
| Corridor letter not present in the grid                                                                         | Blocking | `room`            |
| `discoveredRooms` letter not present in the grid                                                                | Blocking | `room`            |

The editor adds rules the game does not check (blocking or warning):

| Rule                                                                                                                                                                | Severity |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Starting positions count 1–4, unique cells, valid cells                                                                                                             | Blocking |
| No content (entities) on cells the grid paint overwrote to wall/void                                                                                                | Blocking |
| Two doors occupying the same cell **and** side                                                                                                                      | Blocking |
| `corridors` letters disjoint from `discoveredRooms` letters                                                                                                         | Warning  |
| Monster inventory referencing an unresolvable catalog item                                                                                                          | Blocking |
| Win condition of type `KILL_ALL_OF_TYPE` without a monster type, `SECRET_FOUND` without a secret id, `KILL_AT_LEAST` without a count, `REACH_CELL` without a target | Blocking |
| Dungeon has no win conditions                                                                                                                                       | Warning  |
| Dungeon references an event number not in the catalog                                                                                                               | Blocking |
| `collapsedCorridor` set but the letter is not a corridor                                                                                                            | Blocking |
| Light `radius`/`intensity`/`softness` outside 0..1 semantics (intensity/softness 0..1; radius >= 0)                                                                 | Warning  |
| Interactable `args` not valid JSON / missing required args for its effect (catalog may declare required arg keys)                                                   | Warning  |
| Hero colours duplicated                                                                                                                                             | Warning  |
| Dungeon id not a valid file stem (`^[a-zA-Z][a-zA-Z0-9]*$`), duplicate dungeon ids                                                                                  | Blocking |
| Campaign id/translation namespace mismatch conventions                                                                                                              | Warning  |

## Translation validation

| Rule                                                                          | Severity |
| ----------------------------------------------------------------------------- | -------- |
| Derived key missing text in any language                                      | Blocking |
| Empty text (present but blank)                                                | Warning  |
| Key inventory references a key that no longer maps to any content (unused)    | Warning  |
| Interpolation placeholders (`{...}`) differ between languages of the same key | Warning  |

## Implementation notes

- One pure-Kotlin `Validator` in `core` returning
  `List<Finding(severity, code, message, location?)>` — same output shape for
  live UI and generation gate. Unit-test each rule.
- Codes are stable strings (`grid.rectangular`, `door.side`, ...) used by
  tests and UI click-through routing.
- The canvas renders findings for the open dungeon: red outline for errors
  at a position, amber for warnings; a findings list panel jumps to the
  dungeon/cell on click.
- Live validation must complete for a 60x60 dungeon within a few
  milliseconds (it is a handful of linear scans) — run it synchronously in
  the store's `apply`, no debouncing needed unless measurement says
  otherwise.
