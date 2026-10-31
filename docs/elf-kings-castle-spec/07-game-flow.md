# 07 — Integration with the new game flow

The campaign must work end-to-end in the flow defined by
[docs/welcome-screen-spec/](../welcome-screen-spec/): app opens on the
welcome screen → New Game dialog (campaign, game master, speedrunner
seed) → **hero selection** → run → between-dungeons → campaign
complete.

## Campaign selection

No work: the auto-discovered `campaign.ts` makes `elfKingCastle` appear
in the New Game campaign list (`src/menu/MenuLogic.ts` reads the
registry) with its translated `campaign.elfKingCastle.name`.

## Hero selection

The welcome-screen spec's hero selection (its `04-hero-selection.md`)
selects and renames 1..`Campaign.maxHeroes` heroes from the roster and
passes them into the run through the `init()` heroes override. The elf
campaign consumes that as-is — `maxHeroes: 2`, roster of Mithrael and
Gilyad, rename per the spec's rules. No extension to the
hero-selection spec is required.

## Run construction

`init()` deep-clones the selected heroes — their stat overrides
(movement 2/4), starting equipment (Mithrael's Astari-armbandet) and
`levelNameKey` are plain data and clone through untouched. Every
downstream consumer (radial menu, hero card, save/load) reads the
constructed state and needs no further change.

## Between dungeons

Three chained floors flow through the existing between-dungeons
screen (level-up, trade, `campaignComplete` on the last): nothing new
here beyond the per-floor content. Note for trade: the three new items
are ordinary `Item`s once picked up — they trade and drop like any
other equipment, and once-per-scenario item resets apply on floor
transition.

## Saves

- All new state is additive optional data (`Hero.levelNameKey`, the
  per-item charge property, the darkness reveal flag) — old saves load
  fine, new saves load on the current `saveVersion` without a
  migration step. If implementation discovers this is not true for any
  code path, stop and surface it rather than bumping `saveVersion`
  silently.
- A save mid-elf-campaign contains only standard state plus those
  additive fields; no new top-level `GameState` fields are introduced
  by this spec.

## Scoring

The existing scoring applies unchanged: 50/hp at scenario end, 30×XP
killed monsters (the boss's `experience` from its stat block), item
values + flat magic-item bonus for picked-up items (Alvsköld and the
Astari-armbandet `value`s are card inputs), 50 per
secret, −2 per round. No scoring changes are in scope.

## Game masters / difficulty

The global game masters apply as to any campaign (monster count/damage
modifiers etc. hit the campaign-local monsters through the same
templates as built-ins). If balance analysis (`npm run balanceAnalysis`)
flags the campaign as unwinnable/too easy under the default masters,
report it — do not retune the human-authored stat cards on your own.

## Test and tooling duties

- Colocated tests for every new module: item effects and charges,
  monster template/ability registration and the boss's form
  alternation, the darkness reveal rule, the force-field gating, the
  per-hero level names, floor validators pass, campaign registry entry
  exists with the right roster/decks.
- `npm run check`, `npm test`, `npm run lint`, `npm run prettier` green.
- `TECHNICAL.md` updated: campaign-local content pattern usage (already
  described), the darkness reveal rule, the boss's protected form, and
  the per-hero level names.
- `scripts/export-editor-catalog.ts` regenerates the editor catalog
  from `src/` — run it so the new campaign/items/monsters appear in the
  catalog output; never hand-edit the generated file.
