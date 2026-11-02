// Welcome view model adapter: builds the title-screen view model — the
// translated header and button labels and the build-info footer — from
// the translator and the build info. The welcome screen reads no game
// state beyond whether a run is ongoing (the Continue and Save buttons
// only exist then); the asset id of the background art is resolved here
// so the component only knows the port.

import type { Translator } from '../../uikit';
import type { WelcomeViewModel } from '../../uikit';
import { AssetId } from '../assets';
import { i18nTranslator } from '../i18nAdapter';

export type WelcomeButtonId =
  | 'continue'
  | 'newGame'
  | 'save'
  | 'loadGame'
  | 'settings';

export interface WelcomeViewOptions {
  /**
   * Whether an ongoing run exists in the store: Continue and Save only
   * appear then (the run is not reachable any other way once the menu
   * button leaves the game).
   */
  readonly hasOngoingRun?: boolean;
}

const getButtonLabel = (id: WelcomeButtonId, t: Translator): string => {
  switch (id) {
    case 'continue':
      return t('content.menu.welcome.buttons.continue');
    case 'newGame':
      return t('content.menu.welcome.buttons.newGame');
    case 'save':
      return t('content.menu.welcome.buttons.saveGame');
    case 'loadGame':
      return t('content.menu.welcome.buttons.loadGame');
    case 'settings':
      return t('content.menu.welcome.buttons.settings');
  }
};

export const toWelcomeViewModel = (
  t: Translator = i18nTranslator,
  buildInfo?: { date: string; hash: string } | null,
  options?: WelcomeViewOptions,
): WelcomeViewModel => {
  const hasOngoingRun = options?.hasOngoingRun ?? false;
  // Continue first (the most likely action while a run is parked on the
  // welcome screen); Save sits next to its sibling Load.
  const buttons: WelcomeButtonId[] = hasOngoingRun
    ? ['continue', 'newGame', 'save', 'loadGame', 'settings']
    : ['newGame', 'loadGame', 'settings'];
  return {
    headerText: t('content.menu.welcome.header'),
    buttons: buttons.map((id) => ({ id, label: getButtonLabel(id, t) })),
    footerText: buildInfo ? `${buildInfo.date} - ${buildInfo.hash}` : '',
    backgroundAssetId: AssetId.welcomeBackground,
  };
};
