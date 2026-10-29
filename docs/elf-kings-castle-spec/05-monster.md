# 05 — The boss: Teneldor, the possessed Elf King

## Concept (source: `alvkonungen.md`)

The adventure's antagonist is the **Red Dark Lord** who escaped the Ice
Dragon's Treasure finale ("den röde Mörkerherren lyckades undkomma"),
fled in spirit form to the old elf realm and now possesses the soul of
the noble Arwi Elf King **Teneldor**. The party must free him by
killing the Dark Lord **without Teneldor coming to harm** — which, per
room 9, has a mechanical twist:

> _"Här, högst upp i tornet, står den besatte alvkonungen. Varannan
> omgång är han sig själv, varannan omgång förvandlas han till den röde
> Mörkerherren. Han anfaller dock i båda formerna, varje omgång.
> Äventyrarna får inte anfalla honom när han har alvkonungens kropp._
>
> _När mörkerherren är död är uppdraget slut och alvkonungen befriad."_

One figure, two alternating forms: every other round he is Teneldor
(Elf King body — heroes may NOT attack him), every other round he
transforms into the Red Dark Lord (attackable); he attacks the heroes
every round in both forms. When the Dark Lord dies the mission is over
and the Elf King is freed.

## Type and template

Registered campaign-locally in
`src/campaigns/elfKingCastle/monsters/customMonsters.ts`:

```ts
export const TENELDOR = 'Teneldor'; // the possessed Elf King figure

registerMonsterTemplate(TENELDOR, {
  nameTranslationKey: 'campaign.elfKingCastle.monsters.teneldor',
  // level, actions, defense, health, maxHealth, experience, weapon,
  // armour, shield: from the Red Dark Lord's stat card (the attacking
  // form) — human input
});
```

- `MonsterType` is an open string type; no change to `src/types.ts`.
- Stat block: use the **Red Dark Lord** stats from the base game's
  final battle (the intro names him as the escaped red Dark Lord) —
  confirm with the human; the magazine prints no separate stat card
  for him. The built-in red dark lord template values are the
  reference.
- The form alternation changes **presentation and targetability only**
  — one health pool, one stat block, one monster instance.

## Alternation + protected form (engine change d)

A custom ability handler registered with
`registerMonsterAbilityHandler` and attached via
`registerMonsterAbility` is the campaign-local mechanism; the engine
addition it needs is a single hero-side targetability gate:

- **Hero-untargetable flag**: an additive optional `Monster` field
  (e.g. `untargetableByHeroes?: boolean`, transient, not saved —
  derived from round parity). While true:
  - hero attack targeting rejects him: the attack branches in
    `onTargetCell`/`getCursorType` (`src/hero/ClickInputLogic.ts`)
    and any other hero-attack entry point treat him as non-targetable
    (no attack cursor, no click-attack), exactly like a dead monster;
  - ranged attacks and item effects that damage monsters likewise
    skip him (grep the attack entry points in `core/combat.ts` and
    item damage helpers);
  - **he still attacks** — the flag must not touch monster AI, LOS or
    zone-of-control behaviour.
- **Alternation**: at the start of each round (the round-reset path),
  toggle by round parity: odd rounds → Teneldor (Elf King form,
  `untargetableByHeroes = true`), even rounds → Red Dark Lord form
  (`false`). Parity derives from the existing round counter
  (`turnCount`/round tracking in `src/game.ts`) — deterministic, no
  rng. Whether round 1 is Elf King or Dark Lord form is a content
  decision from the human's reading of "varannan omgång" — pin the
  starting form with a test once decided.
- **Presentation**: name/translation key and sprite swap with the form
  (Teneldor vs the Red Dark Lord) via the monster's rendered
  `nameTranslationKey`/sprite selection; the monster card and log
  lines show the current form. The two sprites are human-authored art
  (built-in static sprites as fallback).
- The dark lord attack pattern of the Dark Lord form
  (`orthogonalFireAttack`, the red dark lord's pattern, per the
  built-in colour mapping) applies while in Dark Lord form; in Elf
  King form he attacks with his weapon as a normal melee attacker —
  his attacks never stop ("Han anfaller dock i båda formerna, varje
  omgång"). If the human's reading instead keeps the fire attack in
  both forms, follow the source; pin with tests.

## Death and victory

- The final floor's win condition is
  `ConditionType.KILL_ALL_OF_TYPE` with `targetMonsterType: TENELDOR`.
  He can only die in Dark Lord form (the protected form cannot be
  attacked), so Teneldor never "comes to harm" by construction — no
  fail-state machinery is needed.
- XP for the kill follows the template's `experience` (scoring awards
  30× monster XP); the base-game dark lord value (4 XP per RULES.md)
  is the reference.
- The freeing of Teneldor is surfaced through human-authored text: the
  victory log / campaign-complete text (`campaign.elfKingCastle.*`
  translations, from `alvkonungen.md`'s closing line). No second
  monster figure, no transformation-on-death hook.

## Other castle monsters

The GM text names a **troll** (room 3, wearing the medallion) and
**orcs** ("Orcherna ser givetvis i mörker och får skjuta pilar ändå!").
Their placements and stats come from the floor plans / the human.
Reuse the global `Troll`/`Orc` types; the orcs' dark-vision note needs
no work — monster AI already ignores the hero-side darkness reveal
rule (03). The troll is created with
`createMonsterWithInventory` so the medallion transfers on death.

## Placement

The boss is placed once, on the final floor, via
`createMonster(TENELDOR, colour, x, y)` at the tower-top cell the plan
shows. Colour: the Dark Lord form is the **red** dark lord — use
`Colour.Red` so the name/sprite resolution and translations line up.

## Content inputs (human)

| Input                                                                                      | Used by                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------- |
| Confirmation: Red Dark Lord stat block for the boss                                        | `registerMonsterTemplate` overrides |
| Starting form on round 1 (Teneldor or Dark Lord)                                           | alternation toggle + test           |
| Attack pattern per form (weapon melee in Elf King form, orthogonal fire in Dark Lord form) | ability handler                     |
| Position on the final floor                                                                | `createMonster` placement           |
| Other castle monsters (types, stats, positions, troll inventory)                           | layout + templates                  |
| Victory / Elf-King-freed text (sv, provided in `alvkonungen.md`)                           | win-screen and log translations     |
