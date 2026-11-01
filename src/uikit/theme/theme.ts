// The theme token model for the canvas UI kit. Every color and font a
// renderer writes comes from here; nothing under src/uikit or a converted
// renderer holds a style literal (see docs/ui-kit-spec/03-theme-and-parameterization.md).
//
// Tokens are role-named, not value-named: two roles may hold the same value
// today so a future theme can split them, and one role never changes
// meaning between components.

/** Recursively-optional variant of a theme, for overrides. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface UiTheme {
  readonly palette: {
    readonly text: {
      /** Strongest text on dark surfaces (#ffffff). */
      readonly bright: string;
      /** Headings on dark panels. */
      readonly strong: string;
      /** Default body text on dark panels. */
      readonly body: string;
      /** De-emphasized captions and footers. */
      readonly faint: string;
      /** Debug overlay printout (kept as the exact current value). */
      readonly debug: string;
      /** Section subheaders on corner panels and dialogs. */
      readonly muted: string;
      /** Corner-panel headers (diary, event card). */
      readonly panelHeader: string;
      /** Secondary body text on panels and dialogs. */
      readonly secondary: string;
      /** Success-tinted text on corner panels (fulfilled, notes). */
      readonly success: string;
      /** Parchment diary header. */
      readonly diaryHeader: string;
      /** Amber event title. */
      readonly eventTitle: string;
      /** Gold score-chip text. */
      readonly hudScore: string;
      /** Dimmed text (disabled inputs). */
      readonly dimmed: string;
      /** Selected row/list text (gold tint). */
      readonly rowSelected: string;
      /** Title text on the inventory popover. */
      readonly inventoryTitle: string;
      /** Item name text on the inventory popover. */
      readonly inventoryItem: string;
      /** Item description text on the inventory popover. */
      readonly inventoryDescription: string;
      /** Empty-inventory note text. */
      readonly inventoryEmpty: string;
      /** 'Used' label on a spent inventory item. */
      readonly inventoryUsed: string;
      /** Green log-entry text in the open dropdown. */
      readonly hudLogEntry: string;
      /** Warm gold dungeon-intro title. */
      readonly introTitle: string;
      /** Dungeon-intro body text. */
      readonly introBody: string;
      /** Title text on colored actor cards. */
      readonly cardTitle: string;
      /** Stat text on colored actor cards. */
      readonly cardStat: string;
      /** Detail text on colored actor cards. */
      readonly cardDetail: string;
      /** Gold header on centered dialog panels. */
      readonly headerDialog: string;
      /** Value/label text on dialog rows and inputs. */
      readonly dialogValue: string;
    };
    readonly border: {
      /** Hairline panel and item borders. */
      readonly subtle: string;
      /** Emphasized borders: tooltips, hovered items. */
      readonly soft: string;
      /** Circular outlines on dark overlays (radial menu). */
      readonly ring: string;
      /** Hovered circular outline (radial menu). */
      readonly ringHover: string;
      /** Faintest panel outline (corner panels, dividers). */
      readonly hairline: string;
      /** Hovered corner-panel outline. */
      readonly panelCornerHover: string;
      /** Section divider inside a corner panel. */
      readonly divider: string;
      /** Separator between corner-panel notes. */
      readonly separator: string;
      /** Collapse/expand toggle outline. */
      readonly toggle: string;
      /** Gold hairline around the dungeon-intro panel. */
      readonly panelIntro: string;
      /** Hovered dungeon-intro button outline. */
      readonly buttonIntroHover: string;
      /** Resting outline of a colored actor card. */
      readonly card: string;
      /** Gold border of a centered dialog panel. */
      readonly panelDialog: string;
      /** Resting dialog row outline. */
      readonly row: string;
      /** Hovered dialog row outline. */
      readonly rowHover: string;
      /** Selected dialog row outline. */
      readonly rowSelected: string;
      /** Input/track outline on dialogs. */
      readonly input: string;
      /** Secondary (neutral) button outline. */
      readonly buttonSecondary: string;
      /** Slider handle outline. */
      readonly sliderHandle: string;
      /** Resting green HUD chip outline (log chip, dropdown). */
      readonly hudLog: string;
      /** Opened log-chip outline. */
      readonly hudLogOpen: string;
      /** Hovered log-chip outline. */
      readonly hudLogHover: string;
      /** Gold score-chip outline. */
      readonly hudScore: string;
      /** Green timer-chip outline. */
      readonly hudTimer: string;
      /** Selected checkbox outline. */
      readonly checkboxSelected: string;
      /** Focused input outline. */
      readonly inputFocus: string;
      /** Primary (accent) button outline. */
      readonly buttonPrimary: string;
      /** Highlight border of the acting hero's card. */
      readonly heroCurrent: string;
      /** Inventory popover outline (parchment). */
      readonly popoverInventory: string;
      /** Inventory button outline on a hero card. */
      readonly inventoryButton: string;
      /** Inventory item divider. */
      readonly inventoryDivider: string;
      /** Usable-item button outline. */
      readonly useButton: string;
      /** Used-item button outline. */
      readonly useButtonDisabled: string;
    readonly surface: {
      /** The translucent menu modal panel. */
      readonly panelMenu: string;
      /** Resting list-item background. */
      readonly item: string;
      /** Hovered/selected list-item background. */
      readonly itemHover: string;
      /** Corner panel (diary, event card) background. */
      readonly panelCorner: string;
      /** Hovered collapsed corner-panel toggle square. */
      readonly panelCornerHover: string;
      /** The translucent dungeon-intro panel. */
      readonly panelIntro: string;
      /** Resting dungeon-intro close button. */
      readonly buttonIntro: string;
      /** Hovered dungeon-intro close button. */
      readonly buttonIntroHover: string;
      /** Collapse/expand toggle fill. */
      readonly toggle: string;
      /** Hovered collapse/expand toggle fill. */
      readonly toggleHover: string;
      /** Fallback fill when an actor card has no colour. */
      readonly cardFallback: string;
      /** Solid centered dialog panel. */
      readonly panelDialog: string;
      /** Resting dialog row fill. */
      readonly row: string;
      /** Hovered dialog row fill. */
      readonly rowHover: string;
      /** Selected dialog row fill (gold tint). */
      readonly rowSelected: string;
      /** Input field and slider track fill. */
      readonly input: string;
      /** Slider track fill. */
      readonly sliderFill: string;
      /** Slider handle fill. */
      readonly sliderHandle: string;
      /** Neutral secondary button fill. */
      readonly buttonSecondary: string;
      /** Hovered neutral secondary button fill. */
      readonly buttonSecondaryHover: string;
      /** Welcome screen backdrop while the art is missing. */
      readonly welcome: string;
      /** Opened log chip (top bar HUD). */
      readonly hudLogOpen: string;
      /** Hovered log chip. */
      readonly hudLogHover: string;
      /** Resting log chip. */
      readonly hudLog: string;
      /** Open log-dropdown panel. */
      readonly hudDropdown: string;
      /** Resting checkbox fill. */
      readonly checkbox: string;
      /** Selected checkbox fill. */
      readonly checkboxSelected: string;
      /** Primary (accent) button fill. */
      readonly buttonPrimary: string;
      /** Hovered primary button fill. */
      readonly buttonPrimaryHover: string;
      /** Inventory popover fill (parchment). */
      readonly popoverInventory: string;
      /** Inventory button fill on a hero card. */
      readonly inventoryButton: string;
      /** Hovered inventory button fill. */
      readonly inventoryButtonHover: string;
      /** Close-button fill inside a popover. */
      readonly closeButton: string;
      /** Hovered close-button fill inside a popover. */
      readonly closeButtonHover: string;
      /** Usable-item button fill. */
      readonly useButton: string;
      /** Hovered usable-item button fill. */
      readonly useButtonHover: string;
      /** Used-item button fill. */
      readonly useButtonDisabled: string;
    };
    readonly overlay: {
      /** Backdrop behind the corner menu modal. */
      readonly scrim: string;
      /** Heavier backdrop / dark circular button fill. */
      readonly scrimStrong: string;
      /** Tooltip fill on top of the board. */
      readonly tooltip: string;
      /** Vignette start over the welcome backdrop. */
      readonly vignetteStart: string;
      /** Vignette end over the welcome backdrop. */
      readonly vignetteEnd: string;
      /** Backdrop behind centered dialogs. */
      readonly scrimDialog: string;
    };
    readonly hover: {
      /** Hover fill over a dark circular button (radial menu). */
      readonly radialFill: string;
    };
    readonly status: {
      /** Outline of the acting monster's card. */
      readonly monsterCurrent: string;
      /** Outline of the targeted monster's card. */
      readonly monsterTarget: string;
      /** Outline of a hovered actor card. */
      readonly hoverCard: string;
    };
  };
  readonly typography: {
    readonly families: {
      /** The standard UI family. */
      readonly ui: string;
      /** Plain sans fallback used by compact chrome (top bar, menu). */
      readonly plain: string;
      /** Narrower variant for dense overlays. */
      readonly compact: string;
      /** Debug printout family. */
      readonly debug: string;
      /** Monospace family for log text. */
      readonly mono: string;
    };
    readonly sizes: {
      readonly xxs: number;
      readonly xs: number;
      readonly sm: number;
      readonly md: number;
      readonly lg: number;
      readonly xl: number;
      readonly xxl: number;
      readonly xxxl: number;
      readonly title: number;
      readonly display: number;
    };
    readonly weights: {
      readonly regular: string;
      readonly bold: string;
      readonly italic: string;
    };
  };
  readonly shape: {
    readonly strokeWidth: {
      readonly thin: number;
      readonly medium: number;
      readonly regular: number;
      readonly heavy: number;
      readonly thick: number;
    };
  };
  readonly alpha: {
    /** Dimming applied to disabled rows. */
    readonly dimmed: number;
  };
}
