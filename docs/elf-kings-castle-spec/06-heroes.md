# 06 — The two elven heroes

## Card data (source: the printed hero cards)

The adventure is played with the two elf figures from the article
("kan med fördel spelas med de alvfigurer som presenterades i artikeln
ovan"). Their cards define:

| Field        | MITHRAEL                                        | GILYAD                                        | Engine field                                      |
| ------------ | ----------------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| Handlingar   | 2                                               | 2                                             | `actions: 2` (the `newHero` default)              |
| Förflyttning | 2                                               | 4                                             | `movement`/`maxMovement` — override the default 3 |
| Försvar      | 0                                               | 0                                             | `defense: 0` (default)                            |
| Anfall       | "Se Svärd"                                      | "Se vapen"                                    | the equipped `weapon`                             |
| Besvärjelse  | "Se Astari-armbandet"                           | —                                             | starting inventory (below)                        |
| Health       | 7 (the card's 1–7 circles + skull track)        | 7                                             | `health`/`maxHealth: 7` (the `newHero` default)   |
| Level ladder | MÅSTARE / MAGIKER / TROLLKARL / ADEPT / LÄRLING | MÅSTARE / FURSTE / HJÄLTE / RIDDARE / LÄRLING | see "Level ladders"                               |

Implementation, `src/campaigns/elfKingCastle/heroes/elfHeroes.ts`:

```ts
import { newHero } from '../../../hero/HeroLogic';

export const elfHeroes: Actor[] = [
  { ...newHero('Mithrael', Colour.X), movement: 2, maxMovement: 2 },
  { ...newHero('Gilyad', Colour.Y), movement: 4, maxMovement: 4 },
];
```

- The two `Colour` values are content inputs (match the magazine
  figures if they define colours; otherwise pick two distinct values —
  the roster is two, so no `Colour` extension is needed).
- Names, card texts and the level-ladder titles are human-authored
  source content; AI may translate them to `en`.

## Their special abilities (per the cards)

The cards print no engine-level hero ability — the two "special
abilities" resolve to existing mechanics:

- **Mithrael — the Astari-armbandet spell.** Her card's "Besvärjelse:
  Se Astari-armbandet" makes the armband's force field (04) her spell:
  she **starts with the Astari-armbandet in her inventory** (3
  charges). Using it is the existing radial-menu item-use flow
  ("[x] Use items from radial menu" already shipped); no new UI.
  Confirm with the human whether the armband is her starting equipment
  (the card implies it) or found in the dungeon; the default is
  starting equipment. It trades like any item once picked up
  ("bäraren" = the current bearer casts).
- **Gilyad — movement 4.** A stat override on `newHero`, nothing more.
  The base-game riders' movement is 3; `getEffectiveMaxMovement`
  and every movement consumer read the actor's own value, so no
  further wiring exists or is needed.

Because of this, **no hero special-ability framework is required for
this campaign**. The framework designed below is deliberately
**deferred**: it is the ready-made path if the human later wants
hero-native abilities (e.g. surfacing Mithrael's spell as a radial
action bound to her rather than an inventory item, or abilities for
future campaigns). Do not build it as part of this campaign's
milestones.

## Level ladders (engine change b — display only)

Both cards use the same five-rank progression shape (blue → white →
red → gray → black shields), mapped onto the existing `Level` enum
(thresholds and rank-coloured dice are the standard ones — the dice
ranks stay attached to `Level`, which the engine already rolls by):

| `Level`      | Gilyad (standard) | Mithrael (mage titles) |
| ------------ | ----------------- | ---------------------- |
| `APPRENTICE` | LÄRLING           | LÄRLING                |
| `KNIGHT`     | RIDDARE           | ADEPT                  |
| `HERO`       | HJÄLTE            | TROLLKARL              |
| `LORD`       | FURSTE            | MAGIKER                |
| `MASTER`     | MÅSTARE           | MÅSTARE                |

- Gilyad's ladder is exactly the global `content.level.*` names — no
  change.
- Mithrael's needs **per-hero level display names**: an additive
  optional `Hero.levelNameKey?: string` (a translation prefix) resolved
  as `i18n(`${hero.levelNameKey}.${hero.level}`)` with fallback to
  `content.level.${hero.level}` at the two display sites:
  `src/hero/HeroLogic.ts` (level-up log/indicator) and
  `src/ui/HeroCardRendering.ts`. Display only — `Level` itself, XP
  thresholds and dice colours are untouched, and the field needs no
  save treatment beyond cloning with the actor.

## Hero card / selection display

- The hero card shows the hero's items, so Mithrael's armband (with
  its charge count) is visible there already.
- No hero-selection extension is needed: the welcome-screen spec's rows
  ("colour name or sprite as available") suffice; each elf gets a
  human-authored `ActorSprite` (idle/walk/attack/hurt/death row order,
  see [docs/hero-sprite-artist-brief.md](../hero-sprite-artist-brief.md))
  with the built-in static sprite as fallback.

## Deferred: hero special-ability framework (do not build for this campaign)

Kept here so the design is not re-derived later. Mirror the
string-keyed monster/item registries:

- `HeroAbilityDef = { key: string; kind: 'active' | 'passive'; reset?:
'round' | 'scenario' }` as an additive optional `Hero.ability`
  (plain data, cloned by `structuredClone`; handlers resolved by key).
- `src/hero/HeroAbilities.ts`: `registerHeroAbility(key, kind, hook,
handler)` with hooks `'active'` (a new `RadialAction.ABILITY` costing
  a standard action via `spendStandardAction`), `'onAttack'`, `'onDefend'`
  (in `src/core/combat.ts`), `'onTurnStart'` (in `src/game.ts`).
- Handlers deterministic; rng through `src/core/dice.ts`; cadence
  resets wired next to the item reset loop; tests pin each hook.

If built, it requires the same spec-sync duties (`docs/campaign-definition.md`,
`src/campaigns/README.md`, `TECHNICAL.md`, and the welcome-screen spec's
hero-selection row content note).

## Content inputs (human)

| Input                                       | Mithrael | Gilyad   |
| ------------------------------------------- | -------- | -------- |
| Name spelling (card: MITHRAEL / GILYAD)     | ✔       | ✔       |
| Colour                                      | ✔       | ✔       |
| Confirmation: armband as starting equipment | ✔       | —        |
| Level-ladder title texts (sv, on the cards) | ✔       | standard |
| Sprites                                     | ✔       | ✔       |
