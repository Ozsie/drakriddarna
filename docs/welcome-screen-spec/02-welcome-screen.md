# 02 — Welcome Screen

The welcome screen is what a fresh visitor sees. It has three parts: a
full-canvas background image, a centered panel with three buttons, and a
build footer at the bottom.

## Background image

- One static image, `static/images/welcome.png`, served from the app base
  path like other static assets.
- Drawn **cover-fit**: scaled uniformly so it covers the whole canvas,
  centered, overflowing edges cropped (CSS `background-size: cover`
  semantics). It fills the entire canvas — the game board and all other UI
  components are fully covered while the welcome screen is up.
- Loaded through `getReadyImage` from `src/core/ImageCache.ts`, so it is
  cached across redraws.
- **Fallback:** while the image is loading (or missing/failed), draw the
  dungeon-view background color `#121418` (the existing `.dungeon-view`
  background) over the whole canvas, with a subtle dark vignette. The
  fallback is also what the screen looks like until a human artist provides
  the image — the image is human-authored art per the AI policy, and the
  code must not block on it existing.
- The image is drawn at the top of the UI layer (see 01, draw order); the
  welcome panel, dialogs and footer render on top of it.

## Main view panel

A single centered modal panel in the exact style of the between-dungeons
screen and the save/load dialogs:

- Backdrop veil **under the panel but over the image**: the panel itself
  floats on the image; no extra full-screen dim is drawn (the image already
  covers the board). If legibility requires it, a soft radial darkening
  behind the panel is acceptable — no new hard backdrop rectangle over the
  art.
- Panel: fill `#181b22`, border `#d4af37` 2px, corner radius 10, same
  centered sizing rule as the save/load dialog
  (`width = min(560, max(340, viewWidth - marginX * 2))`, centered
  horizontally and vertically).
- A header line in the save/load style (title font `bold 18px Arial,
Helvetica, sans-serif`, color `#fce28a`) using the human-authored welcome
  header string. No canvas-drawn game logo — title treatment belongs to the
  background image.
- Three buttons stacked vertically below the header, in order:

  | Button    | Behavior                                                                                                                                                                                                                                                                          |
  | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | New Game  | Opens the existing new-game dialog (same callback as the canvas menu's New Game). Choosing campaign, game master and game mode and pressing Begin advances to the hero selection screen (see 04); Start there begins the run. Cancel at either step returns to the welcome screen |
  | Load Game | Opens the existing load dialog in load mode (same callback as the canvas menu's Load). Choosing a save loads it; Back returns to the welcome screen                                                                                                                               |
  | Settings  | Switches the welcome view to `'settings'` (see 03)                                                                                                                                                                                                                                |

- Button rows follow the dialog row style: rounded rect radius 6, rest fill
  `rgba(255, 255, 255, 0.04)` / border `#334155`, hover fill `#334155` /
  border `#94a3b8`, label `bold 13px Arial` left-aligned, white `#f1f5f9`
  (hover `#ffffff`). Row height and gap follow the save dialog
  proportions (48px rows, 8px gap) scaled down if the view is short.
- Buttons are enabled at all times; Load Game with no saves present simply
  opens the load dialog, which shows only its Back button (existing
  behavior).

## Build footer

- Bottom center of the canvas, drawn over the background image.
- Content: `${date} - ${hash}` from `$lib/buildInfo.json`, formatted exactly
  like the existing canvas-menu footer.
- Style: `10px Arial, Helvetica, sans-serif`, fill
  `rgba(226, 232, 240, 0.5)`, centered horizontally, baseline offset a few
  pixels above the canvas bottom edge (12px).
- Always visible on all welcome views (main, settings, credits, hero
  selection).

## Input behavior

- Hover highlights a button row; click triggers it.
- Pointer events outside the panel do nothing on the main view (there is no
  backdrop to dismiss).
- `Escape` does nothing on the main view.
- While the new-game or load dialog is open, it captures all input and
  Escape dismisses it, unchanged from today.
- No keyboard navigation of the buttons in v1.

## i18n keys

All new strings are human-authored in at least one language; AI may produce
the translations into the other language. Needed keys (naming follows the
existing `content.menu.*` structure):

| Key                                     | Meaning                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `content.menu.welcome.header`           | The welcome panel heading                                                                  |
| `content.menu.welcome.buttons.newGame`  | New Game button (may reuse `content.menu.mainMenu.buttons.newGame` if the wording matches) |
| `content.menu.welcome.buttons.loadGame` | Load Game button (same reuse rule)                                                         |
| `content.menu.welcome.buttons.settings` | Settings button                                                                            |

`content.menu.settings.*` (settings screen labels) are listed in 03.
