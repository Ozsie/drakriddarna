// New-game dialog view model adapter: the only place that reads the game
// side for the new-game dialog — the campaign registry and the game-master
// difficulty levels — and prebuilds every label.

import { DifficultLevels } from '../../core';
import { campaigns } from '../../campaigns';
import type { Translator } from '@hoard-engine/uikit';
import type {
  NewGameDialogRowVm,
  NewGameDialogViewModel,
} from '@hoard-engine/uikit';
import { i18nTranslator } from '../i18nAdapter';

export const getCampaignRows = (
  t: Translator = i18nTranslator,
): NewGameDialogRowVm[] =>
  Object.values(campaigns).map((campaign) => ({
    id: campaign.id,
    label: t(campaign.nameTranslationKey ?? campaign.name),
  }));

export const getGameMasterRows = (
  t: Translator = i18nTranslator,
): NewGameDialogRowVm[] =>
  DifficultLevels.map((gm) => ({
    id: gm.id,
    label: t(gm.nameTranslationKey ?? gm.id),
  }));

export const toNewGameDialogViewModel = (
  t: Translator = i18nTranslator,
): NewGameDialogViewModel => ({
  titleText: t('content.menu.welcome.buttons.newGame'),
  campaignHeaderText: t('content.menu.selectCampaign.header'),
  gameMasterHeaderText: t('content.menu.selectGameMaster.header'),
  campaignRows: getCampaignRows(t),
  gameMasterRows: getGameMasterRows(t),
  checkboxLabelText: t('content.menu.newGame.speedrunnerMode'),
  seedLabelText: t('content.menu.newGame.rngSeed'),
  actionButtonLabel: t('content.menu.newGame.buttons.begin'),
  secondaryButtonLabel: t('content.menu.saveGame.buttons.cancel'),
});
