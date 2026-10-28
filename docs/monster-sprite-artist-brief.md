# Monster Sprites — Artist Brief

Instructions for drawing animated monster sprite sheets (see `ActorSprite` in
`src/types.ts`, registered per monster type via `registerMonsterTemplate` in
`src/monsters/MonsterRegistry.ts`). Companion document to
`docs/hero-sprite-artist-brief.md` and `docs/tileset-artist-brief.md`; use the
same dark fantasy style, palette and top-down light so monsters sit naturally
on the tileset next to the heroes.

Today every monster renders through the static fallback sheet
(`src/monsters/MonsterRendering.ts:117-181`, one 32x32 slice per type); the
sheets specified here replace that per monster type.

## Deliverable

One PNG per monster sheet, transparent background. Each sheet is a grid of
**frames laid out horizontally, one row per animation** — same layout rules as
the hero brief. Frame size is **per monster type** and differs from the hero
frames (32 x 56):

| Monster   | Frame size | Relative to hero        | Height overlap in a 48 px cell |
| --------- | ---------- | ----------------------- | ------------------------------ |
| Orc       | 36 x 48    | shorter, slightly wider | none — fits the cell exactly   |
| Troll     | 40 x 64    | taller and wider        | 16 px into the cell above      |
| Dark Lord | 32 x 56    | same size               | 8 px into the cell above       |

No gaps, no padding, no labels. If rows have different frame counts, either
pad shorter rows with empty frames to the longest row, or state the exact
counts so they are configured explicitly (the game otherwise derives the
count from image width / frame width).

## Sheet layout

One **row per animation**, in this fixed mandatory order
(`ACTOR_SPRITE_ANIMATION_ORDER` in `src/core/ActorAnimation.ts`):

1. `idle` — loops while standing
2. `walk` — loops while moving
3. `attack` — plays once per attack
4. `hurt` — plays while the monster flashes after taking a hit
5. `death` — plays once when the monster dies

Prefer 4-6 frames for the looping rows, 3-5 for the one-shot rows. The game
advances frames on a fixed timer (default 150 ms), so equal visual beats per
frame.

## Frame anatomy and the anchor

Same anchor discipline as the hero brief, applied per frame size:

- **Feet baseline**: soles rest on the bottom edge of the frame, inset about
  2 px so nearest-neighbor scaling cannot clip them.
- **Horizontal center**: the figure's axis sits at the horizontal midpoint of
  the frame in every frame. No left/right drift between frames.
- The **overlap strip** is everything above the cell the monster stands in:
  none for the orc, top 8 px for the Dark Lord, top 16 px for the troll.
  Keep that strip low-contrast and free of critical reading — it will
  regularly be drawn over or under neighbouring scenery.
- Animation movement is a vertical bob of at most 2-4 px inside the frame;
  never simulated by shifting the feet baseline.

## Facing and scale

- One canonical facing for every monster, matching the heroes: 3/4 top-down
  view facing the viewer slightly. The game does not mirror frames.
- Monsters must read against the tileset as clearly inhuman even in
  silhouette: different posture, gait and proportions from the heroes.

## Per-type designs

### Orc — 36 x 48

- **Weapons**: a crude scimitar (`orc_sword`) in the leading hand; a short
  bow (`orc_bow`) slung across the back. Every orc carries both — melee orcs
  swing the scimitar, archer orcs shoot the slung bow, so the bow must stay
  visible in every frame.
- Shorter and stockier than a hero: hunched shoulders, long arms, wide
  stance. Crude armour and mail (`orc_mail`) — patchy, mismatched.
- The attack row swings the scimitar; the strike frame is the widest
  silhouette in the sheet.

### Troll — 40 x 64

- **Weapon**: a massive two-handed wooden club (`troll_club`), crude and
  knotted. The club is the biggest single object in the sheet.
- Taller and wider than a hero: towering, top-heavy, long arms hanging past
  the knees, small head. Mossy, rocky hide with little armour.
- The attack row is a two-handed overhead smash: lift, hang, crush, recover.
  The crush frame should dominate the cell.
- Slow, heavy gait in the walk row — few but strong frames.

### Dark Lords — 32 x 56

- Same frame size as the heroes: a peer and counterpart to them, visibly the
  boss of the monster cast (regal posture, cape, crown or horns).
- **Weapons**: an ornate longsword (`dark_lord_sword`). The Green Dark Lord
  carries its own variant blade (`green_dark_lord_sword`) — same role,
  visibly distinct hilt/edge. The Blue Dark Lord additionally carries a
  shield (`blue_dark_lord_shield`) in the off hand, visible in every frame.
- **Four colour variants** — Green, Blue, Red and Yellow — one sheet each.
  Base design identical; the variant colour is the cape/robe accent and the
  most saturated thing in the frame. Red and Yellow otherwise use the
  standard longsword, Green the variant blade, Blue sword plus shield.
- The attack row is a disciplined sword technique: windup, clean strike,
  follow-through, return — crisper and more controlled than the orc's or
  troll's swings.

## Animation specs

- **idle** — subtle breathing loop; first and last frame near-identical.
  The troll may sway its bulk; the Dark Lord may billow its cape.
- **walk** — seamless step cycle with 1-2 px bob; each type keeps its own
  gait (orc scurry, troll stomp, Dark Lord stride).
- **attack** — one-shot, first frame matching the idle posture, strike frame
  with the widest silhouette.
- **hurt** — recoil flinch; readable as a pose, not a color change (the game
  flashes the monster white on top).
- **death** — one-shot stagger, fall, collapse. The final frame stays while
  the body remains, so it must read as clearly "down".

## Portraits

Alongside the sprite sheets, deliver one **portrait per monster design** —
six total: orc, troll, and one per Dark Lord variant (green, blue, red,
yellow). These are the images shown on monster cards (today the card shows
only a colour swatch; see `src/ui/MonsterCardRendering.ts`).

- **Size**: square, 128 x 128 px, PNG, transparent background, no frame and no
  text. Work at this resolution even though cards display smaller — the
  portrait is scaled down at render time, and downscaling keeps detail far
  better than upscaling.
- **Framing**: head-and-shoulders bust, facing the same 3/4 direction as the
  sprite. Eye line around 40% from the top; keep the whole head inside a
  8 px safe margin — the card clips and scales the portrait, and anything in
  the outer strip can be cut or blurred.
- **Identity**: the portrait must match the sheet's design for the same type —
  same skin, hide or armour, same proportions read as a bust:
  - **Orc**: tusked scowl, patchy mail visible at the shoulders, the orc
    bow slung over one shoulder in frame.
  - **Troll**: heavy brow, undersized head on massive shoulders, mossy
    hide; the club's head may rest into frame over one shoulder.
  - **Dark Lords**: crowned or horned, regal posture; the variant colour
    shows as the robe/cape at the collar and stays the most saturated
    element. The Green Dark Lord's variant sword hilt and the Blue Dark
    Lord's shield strap should be visible over the shoulders.

## Check before delivery

- Feet on the baseline and axis at the horizontal midpoint in every frame.
- `idle` and `walk` loop with no visible jump between last and first frame.
- Orc's bow and Blue Dark Lord's shield visible in every frame of every row.
- Silhouette-only test: each type is identifiable with colors removed, and
  the attack strike frames read at a glance.
- Overlap strips (top 8 px Dark Lord, top 16 px troll) carry nothing
  critical.
- Every row has the agreed frame count; no art bleeds over the frame bounds.

## Integration notes for the developer

Each sheet plugs into a monster template so every placed monster of that type
inherits it (`registerMonsterTemplate`, see `src/campaigns/README.md`):

```ts
registerMonsterTemplate(MonsterType.TROLL, {
  // ...stats...
  sprite: {
    image: trollSprite,
    frameWidth: 40,
    frameHeight: 64,
    frameDurationMs: 150,
    animations: { idle: 4, walk: 6, attack: 4, hurt: 2, death: 5 },
  },
});
```

The same `renderActorSprite` change called for in the hero brief is required
here too: it currently scales each frame into a square `cellSize x cellSize`
box, which squashes these non-square frames. It must draw proportionally with
`s = cellSize / 48`, destination `frameWidth * s` x `frameHeight * s`,
horizontally centered on the cell and bottom-anchored on the cell's floor.
The dynamic layer must also draw actors in y-ascending order (see the hero
brief) so the troll's head overlaps the scenery behind it, not in front of
it. Monster frame sizes are per type, so the draw math must read
`sprite.frameWidth`/`sprite.frameHeight` rather than assume the hero size.

Portraits are a new asset: the monster card currently paints a colour swatch
(`monster.colour`, fallback `#CD5C5C` in `src/ui/MonsterCardRendering.ts`),
so a portrait slot and image hookup on the card need to be added as part of
the integration.
