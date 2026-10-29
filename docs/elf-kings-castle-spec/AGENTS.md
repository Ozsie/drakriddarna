# Drakriddarna — Alvkonungens Borg (The Elf King's Castle)

A new official-material campaign: the castle floors as chained
dungeons under an eternal-darkness reveal rule, the two new item cards
(Alvsköld, Astari-armbandet) plus the medallion and mirror scenario
items, the boss Teneldor — the possessed Elf King alternating every
other round with the Red Dark Lord — and the two elven heroes Mithrael
and Gilyad with their card stats and level ladders. Integrated with the
welcome-screen game flow (campaign select → hero selection → run).

## Specification

The full spec lives in [`docs/elf-kings-castle-spec/`](./). It is
authoritative for the campaign bundle structure, the four engine
mechanics, monster/item registration, floor chaining and milestones.

Read it in this order before writing any code:

1. `README.md` — scope, decisions already made
2. `01-architecture.md` — engine touch points, module layout
3. `02-campaign-bundle.md` — folder, decks, translations, roster
4. `03-dungeons.md` — the floors, the nine rooms, darkness rule
5. `04-items.md` — Alvsköld, Astari-armbandet, medallion, mirror
6. `05-monster.md` — Teneldor/the Red Dark Lord and the ending
7. `06-heroes.md` — Mithrael and Gilyad, level ladders, the deferred
   hero-ability framework
8. `07-game-flow.md` — welcome-screen integration, saves, scoring
9. `08-milestones.md` — M1–M7 with definitions of done

Where the spec and the game source disagree, **the game source wins**
(`src/campaigns/README.md` and `src/monsters/MonsterRegistry.ts` for
the registration patterns, `src/dungeon/dungeonParser.ts` for the
authoring DSL, `src/core/dice.ts` for rank-coloured dice,
`src/core/combat.ts` and `src/hero/ClickInputLogic.ts` for attack
targeting, `src/monsters/MonsterLogic.ts` for monster attack
selection, `src/game.ts` for turn flow and win checks).

## Repository layout

- New campaign code: `src/campaigns/elfKingCastle/**` (campaign.ts,
  dungeons/, items/, monsters/, heroes/, translations/) — self-contained,
  auto-discovered, no core registration edits.
- Engine changes, exactly the four specified (do not exceed them): the
  per-dungeon `contentRevealRadius` darkness rule, the boss's
  hero-untargetable form flag and per-round alternation, the
  force-field attack gating in monster attack selection, and the
  per-hero level display-name field. All additive optional state; no
  `saveVersion` bump.
- Spec-sync in the same change as the code: `docs/campaign-definition.md`,
  `docs/dungeon-definition.md`, `src/campaigns/README.md`,
  `TECHNICAL.md`.

## AI policy

Per the project AI policy (see the repo `README.md`): all game content
is human-authored. The Swedish source content for this adventure is
**provided** in [`alvkonungen.md`](../../alvkonungen.md) (intro, GM
information, the nine room descriptions) and the card transcriptions
in 04/06 — use it verbatim; AI may create the `en` translations of
these existing texts and may not reword, extend, invent or
"balance" any stat, rule, or text. The three floor plans still need a
human transcription into grids (03). Art (sprites, tileset) is
human-authored; the built-in static sprites and tileset are fallbacks
until delivered.

## Non-negotiable rules

- The campaign bundle is self-contained: campaign-local registries
  only (`registerItemEffect`, `registerMonsterTemplate`,
  `registerMonsterAbility(Handler)`, `registerEventEffect`); no shared
  file in `src/items/`, `src/monsters/`, `src/events/` is edited for
  content.
- Engine changes are limited to the four specified mechanics. A hero
  special-ability framework is **deferred** (06) — do not build it for
  this campaign. Anything else stops and is surfaced first.
- No `saveVersion` bump: everything new is additive optional data.
- The boss is one figure alternating Teneldor ↔ Red Dark Lord; heroes
  cannot attack him in Elf King form; his death is the end condition
  (`KILL_ALL_OF_TYPE`). There is no second monster figure and no
  death-transformation hook.
- The darkness rule hides room **contents** (monsters, items) until a
  hero is within `contentRevealRadius` squares — never through walls —
  and never affects monster AI.
- The hero roster is Mithrael and Gilyad only; `maxHeroes: 2`.
- All user-facing strings in both `en` and `sv` via sveltekit-i18n under
  the `campaign.elfKingCastle.*` namespace; no hardcoded text; Swedish
  texts verbatim from the source.
- Gameplay-affecting randomness only through the seeded rng in
  `src/core/dice.ts` (the boss's form alternation is round parity —
  deterministic, no rng).
- Strict TypeScript, no `any`, no `console`; colocated `*.test.ts` per
  new module; prettier single quotes and 2-space indent.
- Regenerate `scripts/export-editor-catalog.ts` output; never hand-edit
  it.

## Working discipline

Work through milestones M1–M7 in `08-milestones.md` strictly in order;
each milestone's definition of done must be satisfied before the next
begins. Content slots that a human has not yet filled (chiefly the
floor-plan transcriptions and the small confirmations in 04/05/06)
block only the parts of a milestone that need them — build the
mechanism, leave the value to the human, and say so. Run `npm run
check`, `npm test`, `npm run lint` and `npm run prettier` before
considering work done.
