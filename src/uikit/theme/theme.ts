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
      /** Corner-panel body text. */
      readonly panelBody: string;
      /** Success-tinted text on corner panels (fulfilled, notes). */
      readonly success: string;
      /** Parchment diary header. */
      readonly diaryHeader: string;
      /** Amber event title. */
      readonly eventTitle: string;
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
    };
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
    };
    readonly overlay: {
      /** Backdrop behind the corner menu modal. */
      readonly scrim: string;
      /** Heavier backdrop / dark circular button fill. */
      readonly scrimStrong: string;
      /** Tooltip fill on top of the board. */
      readonly tooltip: string;
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
    };
  };
}
