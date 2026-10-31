# 08 — Milestones

Work through the milestones in order; each definition of done must be
satisfied before the next begins. M1–M5 build on the engine as it is
today (playable via `init('elfKingCastle')` even before the
welcome-screen flow lands); M6 depends on the welcome-screen spec's
hero selection being implemented. Content is provided in
`alvkonungen.md` and the card transcriptions (04/06); the only
outstanding human inputs are the three floor-plan transcriptions and
the small confirmations listed in each section.

## M1 — Engine mechanics

- The four engine changes: darkness `contentRevealRadius` (03), the
  boss's hero-untargetable form + per-round alternation flag (05), the
  force-field attack gating (04), per-hero level display names (06).
  Each wired at its specified hook sites, additive optional fields
  only, built-in campaigns unaffected.
- Spec-sync in the same change: `docs/campaign-definition.md`,
  `docs/dungeon-definition.md` (the dungeon field),
  `src/campaigns/README.md`, `TECHNICAL.md`.
- Tests: reveal radius flipping (incl. not through walls), untargetable
  gating at every hero attack entry point while monster AI is
  untouched, alternation parity from the round counter, force-field
  cell protection (melee + ranged), level-name fallback.
- **Done when**: `npm run check && npm test && npm run lint` green with
  the mechanics exercised from test fixtures on a base campaign.

## M2 — Campaign skeleton and items

- `src/campaigns/elfKingCastle/` folder, `campaign.ts` with the first
  floor, translations structure (`translations/{en,sv}.json` + logs
  files), the roster (Mithrael movement 2 with the Astari-armbandet,
  Gilyad movement 4), and all four items in `items/customItems.ts`
  (Alvsköld `dice: 1`, Astari-armbandet with 3 charges, medaljong,
  spegel).
- **Done when**: the campaign appears in the registry and is startable
  with the elf party; deck building contains the card items in the
  right amounts; item effect and charge tests pass.

## M3 — The boss

- `monsters/customMonsters.ts`: the Teneldor template (Red Dark Lord
  stat block, `Colour.Red`), the alternation handler, form-based
  name/sprite switching, the `KILL_ALL_OF_TYPE` win condition wiring.
- **Done when**: a test dungeon with the boss passes: he alternates
  forms by round parity, is untargetable in Elf King form at every
  attack entry point, attacks every round in both forms, and his death
  fulfils the win condition and ends the scenario.

## M4 — Floors

- The three floor definitions transcribed by the human from the
  magazine plans, chained via `nextDungeon`, with the nine rooms
  implemented per the 03 table (elf appearance, reliefs/notes,
  medallion troll, item-gated hidden door, mirror + hook, fountain,
  stairs, boss tower), the darkness rule active on every floor, and
  the orcs shooting regardless.
- **Done when**: all three floors pass `dungeonValidator`, the chain
  plays floor 1 → 2 → 3 with between-dungeons screens, the room
  mechanics fire with their verbatim texts, and the campaign-complete
  screen shows per-floor statistics.

## M5 — Content completion

- All `sv` translation content in place from `alvkonungen.md` and the
  cards; AI-produced `en` translations reviewed; Mithrael's level
  titles displayed; hero sprites and item/boss art either delivered or
  falling back cleanly.
- **Done when**: a full playthrough shows no raw keys, correct
  Swedish texts and readable English.

## M6 — New-game-flow integration

- `maxHeroes: 2` consumed by the hero selection, rename flow verified
  with the elf roster, saves mid-campaign at every floor load
  correctly (including the reveal flags and boss form state).
- **Done when**: a full run through welcome → New Game → hero selection
  → three floors → campaign complete works, including save/load at
  every floor and a party wipe.

## M7 — Balance and polish

- `npm run balanceAnalysis` run with results reported to the human
  (the magazine calls this a very hard adventure — the darkness and
  the protected boss are the difficulty); editor catalog regenerated;
  `TECHNICAL.md` final pass; the TODO item "Alvkonungens Borg -
  Official Dungeon and Heroes" can be checked off.
