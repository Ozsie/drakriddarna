// Settings view model adapter: the only place that reads AppSettings for
// the settings view, and the owner of the credits row definitions (with
// their external links). Labels, toggle states, slider values and
// dimmed flags are prebuilt here.

import type { AppSettings } from '../../settings/AppSettings';
import { isDebugModeAvailable } from '../../settings/debugMode';
import type { Translator } from '../../uikit';
import type {
  CreditsViewModel,
  SettingsRowVm,
  SettingsViewModel,
} from '../../uikit';
import { i18nTranslator } from '../i18nAdapter';

export type SettingsRowId =
  | 'music'
  | 'audio'
  | 'musicVolume'
  | 'audioVolume'
  | 'debug'
  | 'language'
  | 'credits';

// The credits rows: the same content the canvas menu's Rights view shows,
// with the external links next to the row definitions (the renderer only
// draws; the click handler opens the url).
export interface CreditsRowDefinition {
  id: string;
  labelKey: string;
  url?: string;
}

export const CREDITS_ROWS: CreditsRowDefinition[] = [
  {
    id: 'implementation',
    labelKey: 'content.menu.rights.implementation',
  },
  {
    id: 'music',
    labelKey: 'content.menu.rights.musicLicense',
    url: 'https://lostintheforest.bandcamp.com/',
  },
  {
    id: 'sfx',
    labelKey: 'content.menu.rights.sfx',
    url: 'https://rgbin.itch.io/knight-monsters-sounds-pack',
  },
  {
    id: 'graphics',
    labelKey: 'content.menu.rights.graphics',
  },
];

// The On/Off suffix follows the existing label pattern of the app's
// toggle rows (the welcome screen inherited it from the canvas menu).
const formatToggleLabel = (label: string, on: boolean): string =>
  `${label}: ${on ? 'On' : 'Off'}`;

export interface SettingsAdapterOptions {
  /**
   * Overrides the build-mode debug gate; defaults to dev-build
   * availability (`isDebugModeAvailable`), which production builds
   * compile to false.
   */
  debugAvailable?: boolean;
}

export const toSettingsViewModel = (
  appSettings: AppSettings,
  t: Translator = i18nTranslator,
  options?: SettingsAdapterOptions,
): SettingsViewModel => {
  // The debug row exists only where debug mode is available at all
  // (dev builds); production deploys hide it so it can't be used to
  // cheat.
  const rows: SettingsRowVm[] = [
    {
      id: 'music',
      kind: 'toggle',
      label: formatToggleLabel(
        t('content.menu.settings.music'),
        appSettings.musicOn,
      ),
      dimmed: false,
    },
    {
      id: 'audio',
      kind: 'toggle',
      label: formatToggleLabel(
        t('content.menu.settings.audio'),
        appSettings.sfxOn,
      ),
      dimmed: false,
    },
    {
      id: 'musicVolume',
      kind: 'slider',
      label: t('content.menu.settings.musicVolume'),
      dimmed: !appSettings.musicOn,
      value: appSettings.musicVolume,
    },
    {
      id: 'audioVolume',
      kind: 'slider',
      label: t('content.menu.settings.audioVolume'),
      dimmed: !appSettings.sfxOn,
      value: appSettings.sfxVolume,
    },
  ];
  if (options?.debugAvailable ?? isDebugModeAvailable()) {
    rows.push({
      id: 'debug',
      kind: 'toggle',
      label: formatToggleLabel(
        t('content.menu.settings.debug'),
        appSettings.debugOn,
      ),
      dimmed: false,
    });
  }
  rows.push(
    {
      // The label names the language being switched to (e.g.
      // "-> Svenska"), like the language item the main menu had.
      id: 'language',
      kind: 'button',
      label: t('content.menu.settings.language'),
      dimmed: false,
    },
    {
      id: 'credits',
      kind: 'button',
      label: t('content.menu.settings.credits'),
      dimmed: false,
    },
  );

  return {
    headerText: t('content.menu.settings.header'),
    backButtonLabel: t('content.menu.loadGame.buttons.back'),
    rows,
  };
};

export const toCreditsViewModel = (
  t: Translator = i18nTranslator,
): CreditsViewModel => ({
  headerText: t('content.menu.rights.header'),
  backButtonLabel: t('content.menu.loadGame.buttons.back'),
  rows: CREDITS_ROWS.map((definition) => ({
    id: definition.id,
    label: t(definition.labelKey),
    url: definition.url,
  })),
});
