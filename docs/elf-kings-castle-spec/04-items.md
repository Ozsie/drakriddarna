# 04 — New items

Two printed cards — **Alvsköld** and **Astari-armbandet** — plus two
adventure-specific scenario items, the **medaljong** (room 3) and the
**spegel** (room 5). All are campaign-local, defined in
`src/campaigns/elfKingCastle/items/customItems.ts` following the
registration pattern in [src/campaigns/README.md](../../src/campaigns/README.md)
— no shared file is edited, and other campaigns never see these items.
Swedish card texts below are verbatim human-authored source content;
AI may translate them to `en`, never reword them.

## Alvsköld (VAPEN / weapon card)

Card text: _"Slå med 1 tärning av samma färg som rangen. En träff tar
bort en av monstrets träffar och gör 1 skada på monstret."_ — roll one
die of the same colour as your rank; a hit removes one of the
monster's hits and deals 1 damage.

Engine mapping — a `Weapon` with `dice: 1`:

- `roll(level, dice)` (`src/core/dice.ts`) already rolls dice of the
  acting hero's rank colour, so "same colour as the rank" comes free;
  the weapon only supplies the count.
- "A hit removes one of the monster's hits and deals 1 damage" is the
  standard attack semantics (one hit = one damage). No effect key
  needed — this is a pure stat card.
- It is a `VAPEN` card, so it belongs in the drawn weapon pool of the
  item deck (or is a fixed placement — the magazine's treasure rules
  decide; default: in the campaign's `itemDeck` like other weapons,
  `amountInDeck` per the human's call).

```ts
const alvskold: Weapon = {
  id: 'alvskold',
  name: 'campaign.elfKingCastle.items.alvskold.name',
  nameTranslationKey: 'campaign.elfKingCastle.items.alvskold.name',
  description: 'campaign.elfKingCastle.items.alvskold.description',
  descriptionTranslationKey:
    'campaign.elfKingCastle.items.alvskold.description',
  type: ItemType.WEAPON,
  dice: 1,
  range: 1,
  twoHanded: false,
  useHearHeroes: false,
  value: 0, // per the human's scoring call
  amountInDeck: 0, // fixed placements and/or deck copies — human decision
};
```

(The remaining `Weapon` fields follow the shape of `weapons[0]` in
`src/items/weapons.ts`; exact `value`/`amountInDeck` are content
inputs.)

## Astari-armbandet (MAGISKA FÖREMÅL card)

Card text: _"Skapar ett magiskt kraftfält i alla rutor intill bäraren
i vilket ingen monster får anfalla. Armbandet kan bara användas tre
gånger. Sätt tre gem på kortet och ta bort ett för varje gång
armbandet används."_ — creates a magic force field in all cells
adjacent to the bearer in which no monster may attack; usable three
times only (three gems, remove one per use).

Engine mapping — a magic item with a charge counter:

- `ItemType.MAGIC`, in the campaign's `magicItemDeck`.
- A unique effect key (e.g. `'astariArmband'`) registered with
  `registerItemEffect`: an **active** use that spawns the force field
  for the current round; `registerItemReset` is **not** used — the
  card's cadence is per-use charges, not per-round reset.
- **Charges**: the three gems are a persistent per-item counter. Items
  have no charge field today; implement it via the existing
  `properties` map (`ItemProperties`, e.g. `properties: { CHARGES: 3 }`
  decremented on use, `amountInDeck`-style deck removal when spent).
  If a cleaner additive optional `charges` field is preferred, that is
  a `src/types.ts` change + spec sync — pick one, pin it with tests,
  keep it additive.
- **Force field (engine change e)**: while active, no monster may
  attack a hero standing in any cell adjacent (including diagonals —
  "alla rutor intill") to the bearer. Wiring: monster attack
  selection in `src/monsters/MonsterLogic.ts` (and ranged attack
  targeting) skips heroes in protected cells; monsters may still move
  and may still attack heroes elsewhere. The field lasts until the
  round reset (existing round-reset loop clears it). Visual treatment
  (a soft aura light on protected cells) is a rendering nicety using
  the existing light/aura effects, not new machinery.
- Mithrael's card says _"Besvärjelse: Se Astari-armbandet"_ — her spell
  is this item. Per the card she starts with it (06); confirm with the
  human if it should instead be found in the dungeon.

## Scenario items: medaljongen and spegeln

Not printed cards, but adventure contents from the GM text (03):

- **Medaljongen** (room 3): the troll's medallion, transferred to the
  heroes via monster inventory on death (shared `killMonster` path).
  Carrying it enables discovering room 4's hidden door (item-gated
  secret, 03); its `use` says "Teneldor" — teleport to room 4 and
  reveal the secret door there. `amountInDeck: 0` (fixed placement in
  the troll's inventory). Its back inscription is the human-authored
  description.
- **Spegeln** (room 5): carryable, `amountInDeck: 0`, placed at the
  pillar. Used at room 6's golden hook (interactable checks the
  carrier), whereupon it is consumed/re-positioned and the secret door
  is revealed. Pickup log carries the mirror-script text verbatim.

Both are plain `Item`s once carried: they trade and drop like any
equipment.

## Known engine constraints to respect

- Once-per-round / charge / once-per-scenario behaviour must state its
  cadence next to the registration and be pinned by tests (the TODO's
  Necklace-of-Light and Potion-of-Speed drift are the cautionary
  tales).
- Gameplay-affecting randomness inside effects uses the seeded rng in
  `src/core/dice.ts`, never `Math.random()`.
- Deaths that transfer monster inventory must go through the shared
  `killMonster` path — do not bypass it in new effect code.

## Content inputs (human)

| Input                                                   | Alvsköld | Astari-armbandet            | Medaljongen         | Spegeln    |
| ------------------------------------------------------- | -------- | --------------------------- | ------------------- | ---------- |
| Name text (sv) — provided on the cards / in the article | ✔       | ✔                          | ✔                  | ✔         |
| Description text (sv) — provided verbatim               | ✔       | ✔                          | ✔                  | ✔         |
| `value` (scoring)                                       | ✔       | magic-item flat 100 applies | ✔                  | ✔         |
| `amountInDeck` / fixed placement                        | ✔       | deck (magic)                | 0 (troll inventory) | 0 (pillar) |
| Confirmation: Mithrael starts with the armband?         | —        | ✔                          | —                   | —          |
