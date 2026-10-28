# Hero Sprites — Artist Brief

Instructions for drawing animated hero sprite sheets (see `ActorSprite` in
`src/types.ts` and the render path in `src/core/ActorSpriteRendering.ts`).
Companion document to `docs/tileset-artist-brief.md`; use the same dark
fantasy style, palette and top-down light so heroes sit naturally on the
tileset.

## Deliverable

One PNG per hero, transparent background. The image is a sprite sheet of
**frames, each exactly 32 px wide x 56 px tall**, laid out as a strict grid:
frames run horizontally, animations run as rows. No gaps, no padding, no
labels.

Example for a sheet with 6 frames per row: **192 x 280 px**. If rows have
different frame counts, either pad shorter rows with empty frames to the
longest row, or tell the developer the exact counts so they are configured
explicitly (the game otherwise derives the count from image width / 32).

## Sheet layout

The game expects one **row per animation**, in this fixed order — the row
order is mandatory because it is hardcoded (`ACTOR_SPRITE_ANIMATION_ORDER`
in `src/core/ActorAnimation.ts`):

1. `idle` — loops while standing
2. `walk` — loops while moving
3. `attack` — plays once per attack
4. `hurt` — plays while the actor flashes after taking a hit
5. `death` — plays once when the hero dies

Prefer 4-6 frames for the looping rows, 3-5 for the one-shot rows. More
frames read smoother; keep every frame duration visually equal (the game
advances frames on a fixed timer, default 150 ms).

## Frame anatomy and the anchor

Each 32 x 56 frame is taller than the walkable cell is wide, so heroes
overlap the cell above them by design. The game anchors every frame by its
feet, so this discipline must be identical in every frame of every animation:

- **Feet baseline**: the soles of the feet rest on the bottom edge of the
  frame, inset about 2 px so nearest-neighbor scaling cannot clip them.
- **Horizontal center**: the figure's vertical axis sits at x = 16 in every
  frame. No left/right drift between frames.
- The figure may occupy the full frame height; aim for roughly 48-56 px of
  actual figure, not counting weapon swings that may leave the frame width.

So the top ~8 px of the frame is the overlap zone that will be covered by or
cover the row of cells above. Two rules follow:

- Keep heads, hats and plumes simple and low-contrast in the top strip —
  they will regularly be drawn over neighboring scenery.
- Never put gameplay-critical reading (weapon mid-swing, hit flash pose) only
  in the top strip.

Animation movement (walk bob, attack windup) must be vertical bob of at most
2-4 px within the frame; do not simulate it by shifting the feet baseline.

## Facing and scale

- One canonical facing for the whole sheet, the same for every hero:
  a 3/4 top-down view, facing the viewer slightly (same angle as the tileset
  walls' front faces). The game does not mirror frames, so include no
  left/right/back variants.
- Full-grown adventurer proportions, roughly 6-7 heads tall. Details must
  read at 32 px width: silhouettes over fine texture; no thin sub-pixel
  outlines that vanish when scaled.

## Animation specs

- **idle** — subtle breathing: chest/shoulder rise-fall and a 1-2 px bob.
  First and last frame should be near-identical so the loop is seamless.
- **walk** — a full step cycle: contact, down, pass, up positions for the
  legs; slight arm counter-swing; 1-2 px vertical bob. Must loop seamlessly.
- **attack** — one-shot: windup, strike (weapon fully extended), brief
  follow-through, return to idle posture. The strike frame should have the
  widest silhouette in the sheet.
- **hurt** — flinch: recoil back and to the side, guard up. The game also
  flashes the actor white, so keep the pose readable as a pose, not as a
  color change.
- **death** — one-shot: stagger, fall, collapse to a lying pose. The final
  frame stays visible while the body remains, so it must work as a static
  image: clearly "down", no ambiguity with idle.

## Per-hero variants

Heroes are told apart on the board mostly by silhouette and colour accent:

- Give each hero a distinct silhouette: different helmet/hair, weapon shape
  and shoulder outline.
- Each hero carries its hero colour as a small, bright accent — cloak, tabard
  or plume — against the shared muted palette. The accent should be the most
  saturated thing in the frame.
- All other colours (leather, steel, skin) come from the same shared palette
  as the tileset so a party of heroes looks like one art set.

## Portraits

Alongside the sprite sheet, deliver one **portrait per hero** — the image
shown on the hero card (today the card shows only a colour swatch; see
`src/ui/HeroCardRendering.ts`).

- **Size**: square, 128 x 128 px, PNG, transparent background, no frame and no
  text. Work at this resolution even though cards display smaller — the
  portrait is scaled down at render time, and downscaling keeps detail far
  better than upscaling.
- **Framing**: head-and-shoulders bust, facing the same 3/4 direction as the
  sprite. Eye line around 40% from the top; keep the whole head inside a
  8 px safe margin — the card clips and scales the portrait, and anything in
  the outer strip can be cut or blurred.
- **Identity**: the portrait must be recognizably the same character as the
  sheet — same helmet/hair silhouette, same weapon silhouette if it crosses
  the shoulders, and the hero colour accent (cloak, tabard or plume) again
  as the most saturated element.
- Deliver portraits in the same order/naming as the sheets so the pairing is
  unambiguous.

## Check before delivery

- Feet on the baseline and axis at x = 16 in every single frame.
- `idle` and `walk` loop with no visible jump between last and first frame.
- `attack` and `death` read as one motion at 150 ms per frame, first frame
  matching the idle posture.
- Silhouette-only test: the attack strike frame must be identifiable with
  colors removed.
- Overlap strip (top ~8 px) carries nothing critical.
- Every row has the agreed frame count; no frame bleeds over the 32 x 56
  bounds.

## Integration notes for the developer

The sheet plugs into the existing `ActorSprite` config:

```ts
const sprite: ActorSprite = {
  image: heroSprite,
  frameWidth: 32,
  frameHeight: 56,
  frameDurationMs: 150,
  animations: { idle: 4, walk: 6, attack: 4, hurt: 2, death: 5 },
};
```

`renderActorSprite` (`src/core/ActorSpriteRendering.ts`) currently scales each
frame into a square `cellSize x cellSize` box, which would squash 32 x 56
frames. It must instead draw proportionally: scale factor `s = cellSize / 48`,
destination width `32*s`, height `56*s`, horizontally centered on the cell
and bottom-anchored so the feet sit on the cell's floor:

```
dx = x * cellSize + (cellSize - 32 * s) / 2
dy = (y + 1) * cellSize - 56 * s
```

With the default 48 px cells this draws a 32 x 56 hero whose head rises 8 px
into the cell above; the overlap is intentional. For the overlap to look
right, the dynamic layer must draw actors in y-ascending order so a hero
standing south of another draws over the other's head. Today the draw order
is party order (`renderHeroes` iterates the hero list, monsters before
heroes), so adding a y-sort of the combined actor list is part of the change.

Portraits are a new asset: the hero card currently paints a colour swatch
(`hero.colour`, fallback `#CD5C5C` in `src/ui/HeroCardRendering.ts`), so a
portrait slot and image hookup on the card need to be added as part of the
integration.
