# Dungeon Tileset — Artist Brief

Instructions for drawing the dungeon ground tileset (`src/lib/DungeonTiles.png`),
including the coordinate map the game code slices the sheet with.

## Deliverable

One PNG image, exactly **1024 x 1024 px**, transparent background. The image is
a strict **16 x 16 grid of square cells, each 64 x 64 px**. No gaps, no padding,
no outer margin, no grid lines, no labels.

The game code cuts the image apart programmatically, so every tile must sit
exactly inside its cell: no artwork bleeding over cell edges, nothing important
touching the outer 1-2 px of a cell (nearest-neighbor scaling can clip it).

Style: top-down dark-fantasy dungeon, muted grey-brown stone, warm ambient light
from above. Pixel-art or painted is fine, but every wall piece must use
**identical** stone texture and lighting so adjacent cells join seamlessly.

## Coordinate system

Columns 0-15 run left to right, rows 0-15 run top to bottom. Cell `(col, row)`
has its top-left corner at pixel `(col x 64, row x 64)`. Cells are referenced
below as `(col, row)`.

## How the wall system works

Walls are one cell thick. Each wall tile has a **top face** (the upper surface
of the wall, catching light) and a **front face** (the vertical stone face,
darker/shadowed) pointing toward the walkable floor. Horizontal and vertical
pieces are separate drawings — a horizontal run and a vertical run use
different tiles even when both are "just a wall". Pieces must connect
seamlessly: the top edge of the mid-segment must line up with the bottom edge
of an end cap, outer corners must continue the texture of the runs they touch,
and floor tiles around them are drawn by other cells.

## Cell-by-cell contents

### Floor variants

Plain walkable dungeon floor, slightly different from each other (cracks,
pebbles, small debris) but tonally identical and interchangeable. They get
mixed pseudo-randomly, so none may look like a special tile:

- `(8,0)`, `(10,0)`, `(11,0)`, `(12,0)`, `(1,5)`

### Outer corners

Convex — the wall turns around a floor area:

- `(0,0)` outer corner, top-left of a wall block
- `(4,0)` outer corner, top-right
- `(0,2)` outer corner, bottom-left; also used as a left end cap
- `(4,2)` outer corner, bottom-right; also used as a right end cap

### Inner corners

Concave — floor wraps around into a wall recess, inside faces visible:

- `(0,4)` inner corner, top-left
- `(4,4)` inner corner, top-right
- `(0,6)` inner corner, bottom-left
- `(4,6)` inner corner, bottom-right

### Straight and end pieces

- `(1,0)` horizontal wall with floor below it
- `(2,4)` horizontal wall with floor above it; also the bottom end cap of a
  vertical run
- `(2,6)` horizontal wall segment, same family as `(2,4)`
- `(4,7)` vertical wall, top end cap
- `(5,7)` vertical wall, plain mid-segment
- `(0,5)` vertical wall whose front face points right
- `(4,5)` vertical wall whose front face points left
- `(15,0)` generic plain wall piece — the fallback tile used wherever the game
  can't classify a cell, including T-junctions opening down/left/right and
  four-way crossings, so it must read convincingly even at a junction
- `(2,0)` collapsed rubble — a pile of broken stones designed as an **overlay**,
  drawn on top of the outer corner at `(0,0)`; keep its silhouette readable on
  top of that stone

### Junction

- `(4,8)` T-junction where a wall stem meets a horizontal run, opening upward

### Objects

- `(7,2)` round stone pillar base, filling the cell
- `(7,1)` upper shaft/cap of that pillar; the game draws it on the cell
  directly **above** the base, so the two must visually stack into one column
- `(13,0)` open pit — dark chasm with crumbled stone edges, at floor level
- `(6,7)` wooden trapdoor set into the floor
- `(9,0)` undiscovered secret marker — a faint rune/scratch on plain floor; the
  game draws it at 60% opacity, so keep it low-contrast
- `(5,4)` discovered secret — the same idea, now clearly revealed (an opened
  rune, disturbed stone); it should read as the "found" counterpart of `(9,0)`
- `(6,3)` generic magic item — a small glowing treasure/potion icon sitting on
  floor

## Check before delivery

- Outer corners connect seamlessly with the wall runs they touch.
- Vertical pieces stack: `(4,7)` cap over repeated `(5,7)` segments looks like
  one wall.
- Floor variants are interchangeable — no variant draws the eye.
- Rubble overlay at `(2,0)` still reads when placed over `(0,0)`.
- Pillar base `(7,2)` and top `(7,1)` stack into a single column.

## Size note

The coordinate map is resolution-independent. If the sheet is delivered with
48 x 48 px cells (768 x 768 px, the size of the current tileset) instead of
64 x 64, only the deliverable size changes — every `(col, row)` above stays
the same.
