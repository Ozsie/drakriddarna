# 04 — Kit Components

The kit primitives replace the per-module layout code that today's renderers
each implement from scratch. Build a primitive only when a second consumer
exists; a primitive with one consumer is speculative generality.

## Primitive catalog

| Primitive     | Notes                                              | Proving consumers                                    |
| ------------- | -------------------------------------------------- | ---------------------------------------------------- |
| modalFrame    | dim scrim, centered panel, title, close behavior   | save/load, new game, dungeon intro, between-dungeons |
| panel, button | states: normal, hover, pressed, disabled, selected | everywhere                                           |
| text          | measure, wrap, ellipsize, align, line height       | cards, diary, event card                             |
| list          | selectable rows, scroll, selection                 | save/load, new-game columns, hero selection          |
| scroll        | clip, offset, scrollbar, wheel and touch hooks     | diary, lists                                         |
| input         | canvas-drawn text input with caret and max length  | save name, hero rename, speedrun seed                |
| chip, bar     | emoji-plus-number chip, HP bar                     | top bar, cards                                       |
| table         | header, rows, column widths                        | campaign-complete tables, high scores                |

## Input and hit testing

- Components return semantic hits. The controller's ordered cascade
  (`DungeonBoardUiHit`) keeps its order and injectable hit-testers; each
  tester now calls a component's `hitTest(layout, point)`.
- The mapping from hit to behavior lives in `src/ui/actions/`, the only
  place that calls game logic in response to UI.
- Keyboard bindings and modal input suppression stay in the controller and
  input manager. The kit exposes no key handling except the text input's
  pure edit reducer (insert, delete, caret, max length).
- Because view models and layouts are plain data, a future DOM mirror could
  be generated from them. That is a benefit, not a deliverable.
