# 04 — Hero Selection

After the player confirms campaign, game master and game mode in the
new-game dialog and presses Begin, the flow continues to a **hero
selection screen** instead of starting the game immediately. The player
picks which heroes to bring, renames them if desired, and starts the game
with that party.

## Campaign-defined limits

- A new **optional** `Campaign` field, `maxHeroes?: number`, defines the
  maximum party size for that campaign.
- When `maxHeroes` is omitted, the maximum defaults to the campaign's own
  roster size (`heroes.length`).
- The **minimum is always 1**, regardless of the campaign.
- This is a `src/types.ts` change: per the repository rules, the campaign
  spec ([docs/campaign-definition.md](../campaign-definition.md)) and
  [src/campaigns/README.md](../../src/campaigns/README.md) must be updated
  in the same change that adds the field.

## Roster and defaults

- The candidates are the selected campaign's `heroes` roster. In every
  campaign today that is the four named heroes from `iceDragonTreasure`
  (`Fearik`, `Helbran`, `Siedel`, `Wulf`) — these names are the defaults,
  and they are existing human-authored content: do not add, rewrite or
  translate-rename them.
- All roster heroes start **selected**, up to the campaign maximum; if the
  roster exceeds `maxHeroes`, only the first `maxHeroes` start selected.
- The player may deselect down to 1 and select up to `maxHeroes`. A
  deselected roster hero is simply not part of the run; it is not deleted
  from the campaign.

## Renaming

- Each selected hero's name is editable via a text input on its row, in
  the style of the save dialog's name input (dark field `#0f1217`, border
  `#fbbf24`, static caret while focused).
- Defaults are the roster names; a rename changes only the display name
  for this run. The hero's `id` stays the original roster id (it derives
  from the default name today and is referenced by saves), and
  `nameTranslationKey` is set to the new name so unrenamed heroes keep
  their translations and renamed heroes display the literal typed name.
- Empty names are not allowed: Start is disabled while any selected hero's
  name is empty, or the empty input falls back to the default name on
  Start (implementation picks one; tests pin the choice).
- Names are user content. The code sanitizes length (clamp to 20
  characters) but never generates, corrects or translates them.
- Only one rename input is focused at a time; the screen captures all
  keyboard input while an input is focused, like the save dialog does.
  Clicking a row toggles its selection; clicking its name field focuses
  the rename input instead.

## Screen layout

Same style as the welcome screen and its sub screens (see 02/03):
centered panel (`#181b22`, `#d4af37` border, radius 10), background image
behind, build footer at the bottom.

- Header: the campaign name (or a human-authored hero-selection header),
  title style `bold 18px Arial`, `#fce28a`.
- One row per roster hero, save-dialog row style (48px rows, 8px gap,
  hover `#334155`). Each row shows a selection state (checkbox in the
  speedrunner-checkbox style of the new-game dialog), the hero colour
  swatch, the editable name field, and the hero's colour name or sprite
  as available.
- Rows beyond the maximum are shown but cannot be selected while the
  party is full (dimmed, no-op click).
- Selected counter, e.g. `2 / 4`, near the header — the count text format
  is human-authored.
- **Start button** (primary action position, bottom-right, save-button
  style): enabled only when 1–`maxHeroes` heroes are selected and no
  name is empty (per the rename rule above). Starts the game.
- **Back button** (bottom-left, secondary style): returns to the
  new-game dialog with the previous dialog selections remembered.
- `Escape` behaves as Back only when no rename input is focused;
  otherwise it defocuses the input first.

## Integration with `init`

- "The selected heroes replace the current hero definition in the
  campaign" — for the run being started, not the campaign module. The
  campaign objects are module singletons registered in
  `src/campaigns/index.ts` and shared across runs; they are never
  mutated.
- `init()` in `src/game.ts` gains a `heroes?: Hero[]` override parameter.
  When present, the override replaces `campaign.heroes` inside the
  existing `structuredClone`-based state construction — every downstream
  consumer (`currentActor`, `applyStartingEquipment`, `resetLiveHeroes`,
  game-master hooks) already reads from the constructed state and needs
  no change.
- The override heroes are deep clones of the roster heroes with the new
  names applied; `newHero` is not re-run (stats and starting equipment
  come from the campaign definition, not the name).
- `onNewGame` in `src/menu/MenuLogic.ts` passes the selection through;
  its signature grows the same optional override.
- Speedrunner mode is unaffected: the seed applies exactly as today, and
  hero selection is a deterministic UI step before `init`.

## i18n keys

Human-authored wording; AI may translate once it exists in one language.

| Key                                        | Meaning                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `content.menu.heroSelection.header`        | Hero selection panel heading                                                         |
| `content.menu.heroSelection.count`         | Selected counter template (`{{selected}} / {{max}}`)                                 |
| `content.menu.heroSelection.buttons.start` | Start button (may reuse `content.menu.newGame.buttons.begin` if the wording matches) |
| `content.menu.heroSelection.buttons.back`  | Back button (same reuse rule as the settings Back)                                   |
