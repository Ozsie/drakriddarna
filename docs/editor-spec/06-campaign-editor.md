# 06 — Campaign Editor & Translations

## Layout

The app has three top-level sections, navigable by a left icon rail or tabs:

1. **Campaign** — metadata, heroes, decks, dungeon chain
2. **Dungeon** — the visual layout editor (05)
3. **Translations** — key/text matrix (below)

A shared header shows: campaign id, dirty state, Save (Ctrl+S — saves
`campaign.editor.json` only), Generate (Ctrl+G — writes all TS/JSON files,
04), and validation status (count of errors/warnings, click -> panel).

## Campaign section

Form-based, grouped:

- **Identity**: id (disabled once files were generated, renaming moves
  folders — out of scope for v1; allow only before first generation),
  translation namespace (default = id), display name (edits the `name`
  text in the current translation language), tileset path, campaign
  description keys.
- **Heroes**: list of 1–4 heroes, each a name + colour picker (distinct
  colours recommended — validation warns on duplicates, 07). v1 uses
  `newHero` only (02).
- **Item deck** / **Magic item deck**: two searchable lists of catalog items
  with a per-item count (0 = not in deck). Default mirrors the game's
  convention: every shared weapon/armour/shield at its `amountInDeck` count,
  all magic items included. Show deck size totals. Deck entry count means
  "include this item `count` times"; the generated code uses the game's
  `amountInDeck` loop (04), so the editor only emits *excluded* items
  differently — implement as a custom filter list, documented in code.
- **Dungeon chain**: ordered list (drag to reorder) of dungeon ids with
  add/duplicate/delete; clicking an entry opens that dungeon in the
  Dungeon section. The chain order defines `nextDungeon` links (04).
- **Events**: a checkbox list of global event numbers (from catalog) that
  the campaign's dungeons may draw (per-dungeon restriction lives in the
  dungeon inspector, 05).

## Translations section

A key/text matrix:

```
Key                                   en                    sv
campaign.myCampaign.name              My Campaign           Min kampanj
campaign.myCampaign.e1m0.name         Troll Cave            Trollgrottan
campaign.myCampaign.e1m0.intro        A hideous troll...    Ett fasansfullt...
```

- Rows come from the **derived key inventory**: every translation key
  referenced by campaign/dungeon content (names, intros, notes, secrets,
  interactables, `onRoomDiscovered` messages, win-condition extra
  descriptions). Keys are listed even if no text exists yet (validation
  marks missing ones, 07).
- Filters: "missing in language", "unused keys", text search.
- Editing a cell updates the project; the key column is read-only (keys are
  derived from content — rename entities in the editors, not here).
- Placeholder preview: show the resolved in-game text of the selected row in
  a small preview card.
- A "raw JSON" toggle shows the exact nested structure that will be emitted
  (04) — read-only.
- Unused-key rows (text exists, content no longer references the key) are
  kept by default (author may be mid-refactor) but flagged; generation
  includes them only if the project has a `keepUnusedTranslations` flag
  (default true). Document in the UI.

## Generation panel

Invoked by Generate (Ctrl+G) or the menu:

1. Runs full validation (07); blocking errors stop generation with the
   panel listing errors (click-through to the offending dungeon/cell).
2. Resolves all catalog refs (03); unresolvable refs are blocking errors.
3. Writes files with the marker protocol (03): refuses hand-modified
   targets unless forced; reports stale generated files with an offer to
   delete.
4. Shows the result: files written, files skipped/forced, warnings.

The panel is also where the game-repo path is configured (saved in app
settings) — used by catalog refresh and by an optional "run game checks"
command (`npm run check` + `npm run prettier` in the game repo, output shown
inline; non-blocking convenience feature, not required for milestone 1).
