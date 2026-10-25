# 05 — Dungeon Editor (Visual Layout)

The dungeon editor is a full-screen canvas view for one `DungeonDoc`,
organized as:

```
┌──────────────┬─────────────────────────────┬───────────────┐
│ Tool palette │        Grid canvas          │ Inspector     │
│ (left rail)  │    (pan/zoom, layers)       │ (selection)   │
└──────────────┴─────────────────────────────┴───────────────┘
                Status bar: cursor cell, zoom, validation summary
```

## Grid canvas

- Renders one cell per grid char at a configurable tile size
  (base 48 px, zoom 25%–400%, mouse-wheel zoom centered on cursor,
  middle-drag or space-drag to pan). Arrow-key panning is not required.
- Cell rendering by content:
  - void (` `): dark background
  - wall (`#`): filled block (tileset texture optional, v1 flat colors are
    fine — texture preview is a nice-to-have, not a milestone item)
  - room letter: floor color keyed by letter + faint letter label
  - corridor letter: floor color keyed by letter with a distinct tint
  - collapsed (`?`): hatched
- Overlays (all rendered on top, individually toggleable in the left rail,
  all on by default): doors (edge marker on the cell edge indicated by
  `side`), monsters (type initial + colour dot), heroes/starting positions
  (numbered 1–4), items, secrets (S), notes (N), interactables, lights
  (radial glow preview using radius/intensity/color), pits/pillars,
  win-condition target cells (flag), hover highlight for the active room
  (all cells sharing the hovered cell's letter).
- The light overlay should approximate the game's final look
  (radial falloff over `ambientLight`) — it is a preview, pixel-accuracy is
  not required.
- Click a cell to select it; the Inspector shows everything at that cell;
  double-click selects the containing room (letter).

## Tools (left rail)

Single active tool at a time, keyboard shortcuts in parentheses:

| Tool                                                       | Shortcut          | Behaviour                                                                                                                                                                       |
| ---------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Select (V)                                                 | V                 | pick cell/entity; drag entities between cells                                                                                                                                   |
| Wall (W)                                                   | W                 | drag-paint `#`                                                                                                                                                                  |
| Void (X)                                                   | X                 | drag-paint ` ` (fails validation if it deletes content beneath — see below)                                                                                                     |
| Room (R)                                                   | R                 | drag-paint the current room letter (letter chosen in a small chooser: next free letter default, A–Z)                                                                            |
| Corridor (C)                                               | C                 | drag-paint current corridor letter; letter auto-added to `corridors` list                                                                                                       |
| Door (D)                                                   | D                 | click a cell, then pick the edge (side) in a 4-way chooser; alt: click near the edge within the cell                                                                            |
| Edge wall (Shift+W)                                        | Shift+W           | like the Door tool: click a cell, pick the edge; toggles a thin wall on the shared boundary (for rooms not separated by a full cell); drag along a row/column paints a wall run |
| Monster (M)                                                | M                 | click to place current monster type + colour (pickers in tool options)                                                                                                          |
| Start pos (1–4)                                            | S                 | click to set starting position slot                                                                                                                                             |
| Item / Secret / Note / Interactable / Light / Pit / Pillar | I / T / N / E / L | click to place; details in Inspector                                                                                                                                            |
| Erase (E)                                                  | Del               | click removes entities at the cell; with wall/void brushes, painting over entities first offers confirmation                                                                    |

Tool options bar under the palette shows per-tool settings (monster type +
colour, item ref, light defaults, etc.). Brushes never write into void
unless the Void tool is active.

## Interaction rules

- Painting a wall/void over a cell holding entities: allowed, but validation
  flags it (07); the canvas outlines such cells in red. The author resolves
  by moving/removing entities.
- Doors live on cell edges; two doors may share a cell on different sides.
  Selecting a door selects the door (not the cell); delete key removes it.
- Edge walls live on cell edges like doors. An edge holds a door **or** a
  wall: placing a door on a walled edge removes the wall, and vice versa.
  The Inspector shows the wall's optional colour override; the layout-wide
  `wallColour` sets the default.
- Dragging an entity moves it; invalid targets (wall/void/out of bounds)
  are rejected visually (drop ignored, entity stays).
- Resize: buttons + arrow affordances on the canvas edges grow/shrink the
  grid (rows appended below, columns right; shrinking crops and warns if
  cropping non-void content).
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z) applies to everything, including grid
  paints (snapshot-based, 01).

## Inspector (right panel)

- Nothing selected: dungeon-level fields — id, name/intro keys (read-only,
  derived), ambient light slider, tileset, music, events list (checkbox list
  of catalog event numbers), collapsedCorridor, portal picker,
  discoveredRooms (letter chips, toggleable), win conditions (add/edit/
  remove with type-specific fields: target cell via "pick on grid" mode,
  monster type, secret id, min count).
- Cell selected: room letter, and a list of entities at the cell, each
  editable inline (door flags, monster inventory refs, secret type/item,
  note message key, interactable effect + args as JSON textarea with
  validation, light color picker + radius/intensity/softness sliders +
  alignment/effect dropdowns).
- "Pick on grid" mode: clicking the canvas assigns the pending target
  (win-condition cell, portal, entity move) instead of the active tool.

## Dungeon list / chaining

A campaign-level side panel (shared with 06) lists dungeons in chain order
with add/duplicate/delete/reorder. Reordering rewrites `nextDungeon` links
at generation. Renaming a dungeon id renames the generated file (stale-file
reporting per 03).
