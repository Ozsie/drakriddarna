# Alvkonungens Borg (The Elf King's Castle) — Specification & Agent Guidelines

This folder contains the complete specification for implementing the
official Sinkadus magazine adventure **Alvkonungens Borg** as a new
campaign: the castle floors as chained dungeons, its two new item cards
(**Alvsköld**, **Astari-armbandet**), the adventure's boss — the
possessed Elf King **Teneldor**, who alternates every other round with
the **Red Dark Lord** — and the two new elven heroes **Mithrael** and
**Gilyad** with their stat cards and level ladders, plus the engine
changes these need (the eternal darkness reveal rule, the boss's
protected form, the armband's force field, and per-hero level display
names).

The human-authored source content lives in
[`alvkonungen.md`](./alvkonungen.md) (Swedish, verbatim from the
magazine; the intro, the GM information with the nine numbered room
descriptions, and the italic read-aloud texts) plus the printed stat
cards transcribed in 04/06. It is the content authority; this spec is
the implementation authority.

The campaign is a self-contained bundle under
`src/campaigns/elfKingCastle/`, registered by auto-discovery. No core
file needs to be edited for the **content** (dungeons, items, monster).
The deliberate **engine** changes are enumerated in the table below and
specified in detail in 03/05/06. Integration with the new game flow
(welcome screen → New Game dialog → hero selection) defined in
[`docs/welcome-screen-spec/`](../welcome-screen-spec/) is part of this
spec.

## Scope decisions (already made — do not relitigate)

| Decision | Choice |
| --- | --- |
| Campaign id / folder | `elfKingCastle`, `src/campaigns/elfKingCastle/` (auto-discovered; display name is human-authored translation content under `campaign.elfKingCastle.name`) |
| Floors | The original floor plans become chained `Dungeon`s played in order with the existing between-dungeons screen between them; stairs (room 8) transition with the existing `'nextDungeon'` interactable |
| Room texts | The nine numbered GM texts in `alvkonungen.md` become `notes`/`onRoomDiscovered` log texts verbatim (sv source; AI may translate to en) |
| New items | Campaign-local `items/customItems.ts` following the registration pattern in [src/campaigns/README.md](../../src/campaigns/README.md); merged into this campaign's decks only. **Alvsköld** = a `Weapon` with `dice: 1` (rank-coloured die comes free via `roll(level, dice)`); **Astari-armbandet** = a magic item with 3 charges creating a force field no monster may attack through. The adventure's **medaljong** (room 3) and **spegel** (room 5) are scenario items placed in the layouts |
| The boss | One monster figure on the top floor alternating every other round: Teneldor (Elf King body — attacks every round but **cannot be attacked by heroes**) ↔ the Red Dark Lord (attackable). His death ends the campaign (win condition `KILL_ALL_OF_TYPE`); no second monster figure |
| Darkness | The castle is in eternal darkness (`ambientLight: 0`): monsters and items in a room are not revealed to the players until a hero is within 2 squares — a new per-dungeon `contentRevealRadius` mechanic (03). Monsters (orcs shooting in the dark) are unaffected: their AI and LOS stay as-is |
| Heroes | Roster = **Mithrael** and **Gilyad** only (the intro says the adventure is played with the elf figures from the article). Card stats in 06; both use the standard health track (7); Mithrael's level ladder uses mage titles (per-hero level display names, 06), Gilyad's the standard one |
| `maxHeroes` | 2 (the roster size; consumed by the welcome-screen hero selection) |
| Engine changes | Exactly these, each specified in its section: (a) the darkness `contentRevealRadius` reveal rule (03), (b) the boss's hero-untargetable form + per-round alternation (05), (c) the force-field attack gating for the armband (04), (d) per-hero level display names (06). A hero special-ability framework is **deferred** (06) — the printed cards need no engine-level hero ability. New `Colour` values are not needed (roster of two). Anything beyond this list: stop and surface it — do not slip it in |
| Engine footprint | The engine diff is kept as small as the source text allows — every room mechanic, item, monster stat and the boss's alternation handler live campaign-locally. The four shared-code changes (03/04/05/06) are the minimum faithful set; if further cuts are requested, the agreed order is: (1) per-hero level names (display-only), (2) the darkness rule (approximate with room discovery + `ambientLight: 0`, deviating from the "within two squares" GM rule), (3) force field (melee-only, inaccurate). The boss's protected form is the irreducible floor |
| Game flow | The campaign must work end-to-end in the welcome-screen flow: campaign select → New Game dialog → hero selection (`maxHeroes: 2`, rename) → run. No hero-selection extension is required — the rows show colour/sprite as the welcome-screen spec already defines |
| Saves | All new state is additive optional fields on existing objects; no `saveVersion` bump, no migration step |
| Art | Sprites/tileset for the elves, items, Teneldor/Dark Lord and the medallion/mirror are human-authored; the built-in static sprites and tileset are the fallback until delivered |
| Difficulty | The global game masters/difficulties apply unchanged; no per-campaign difficulty tuning |

## Content inputs

All in-game text is human-authored and now **provided**: the Swedish
source lives in `alvkonungen.md` and the card transcriptions in 04/06
(items: Alvsköld, Astari-armbandet; heroes: Mithrael, Gilyad). AI may
create the `en` translations of these existing texts and implement the
mechanics they describe; it must not reword, extend or invent content.
The remaining content inputs are listed per section (the three floor
plans themselves — the magazine's map pages — still need a human
transcription into grids).

## Reading order

| Doc | Contents |
| --- | --- |
| [01-architecture.md](./01-architecture.md) | Engine touch points, module layout, dependency on the welcome-screen spec |
| [02-campaign-bundle.md](./02-campaign-bundle.md) | Campaign folder, decks, translations, tileset/music |
| [03-dungeons.md](./03-dungeons.md) | Floors, the nine rooms, darkness rule, win conditions, chaining |
| [04-items.md](./04-items.md) | Alvsköld, Astari-armbandet, the medallion and the mirror |
| [05-monster.md](./05-monster.md) | Teneldor/the Red Dark Lord: alternation, protected form, the ending |
| [06-heroes.md](./06-heroes.md) | Mithrael and Gilyad, level ladders, the hero special-ability framework |
| [07-game-flow.md](./07-game-flow.md) | Integration with welcome screen, hero selection, between dungeons, saves, scoring |
| [08-milestones.md](./08-milestones.md) | M1–M7 with definitions of done |
