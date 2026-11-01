// Welcome view model adapter: builds the title-screen view model — the
// translated header and button labels and the build-info footer — from
// the translator and the build info. The welcome screen reads no game
// state; the asset id of the background art is resolved here so the
// component only knows the port.

import type { Translator } from '../../uikit/env';
import type { WelcomeViewModel } from '../../uikit/components/welcome';
import { AssetId } from '../assets';
import { i18nTranslator } from '../i18nAdapter';

export type WelcomeButtonId = 'newGame' | 'loadGame' | 'settings';

const BUTTON_ORDER: WelcomeButtonId[] = ['newGame', 'loadGame', 'settings'];

const getButtonLabel = (id: WelcomeButtonId, t: Translator): string => {
  switch (id) {
    case 'newGame':
      // Same wording as the canvas menu's New Game item.
      return t('content.menu.mainMenu.buttons.newGame');
    case 'loadGame':
      return t('content.menu.welcome.buttons.loadGame');
    case 'settings':
      return t('content.menu.welcome.buttons.settings');
  }
};

export const toWelcomeViewModel = (
  t: Translator = i18nTranslator,
  buildInfo?: { date: string; hash: string } | null,
): WelcomeViewModel => ({
  headerText: t('content.menu.welcome.header'),
  buttons: BUTTON_ORDER.map((id) => ({ id, label: getButtonLabel(id, t) })),
  footerText: buildInfo ? `${buildInfo.date} - ${buildInfo.hash}` : '',
  backgroundAssetId: AssetId.welcomeBackground,
});
