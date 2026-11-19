import { get } from 'svelte/store';
import { e1m5 } from '../campaigns/iceDragonTreasure/dungeons/e1m5';
import { getCampaign } from '../campaigns';
import { testingGrounds } from '../dungeon/testingGrounds';
import type { GameState } from '../types';
import { updateAppSettings } from '../settings/AppSettings';
import { loadGameState, gameStateStore } from '../store/gameStateStore';
import { appPhaseStore } from '../store/appPhaseStore';
import { createExploredState } from './exploredState';

export type BrowserBenchmarkDungeonId = 'e1m5' | 'testingGrounds';

export interface BrowserBenchmarkScenario {
  campaignId?: string;
  dungeonId?: BrowserBenchmarkDungeonId;
  dungeonIndex?: number;
  seed?: number;
  explored?: boolean;
  projection?: 'topDown' | 'isometric';
}

export interface BrowserBenchmarkBoardSize {
  left: number;
  top: number;
  width: number;
  height: number;
  canvases: Array<{ id: string; width: number; height: number }>;
}

export interface BrowserBenchmarkHarness {
  loadScenario: (
    scenario?: BrowserBenchmarkScenario,
  ) => Promise<BrowserBenchmarkBoardSize>;
  ready: () => Promise<BrowserBenchmarkBoardSize>;
  boardSize: () => BrowserBenchmarkBoardSize;
}

declare global {
  interface Window {
    __drakriddarnaPerf?: BrowserBenchmarkHarness;
  }
}

const getScenarioDungeon = (
  scenario: BrowserBenchmarkScenario,
  campaignId: string,
) => {
  if (scenario.dungeonId === 'testingGrounds') return testingGrounds;
  if (scenario.dungeonId === 'e1m5') return e1m5;
  if (scenario.dungeonIndex !== undefined) {
    const dungeon = getCampaign(campaignId).dungeons[scenario.dungeonIndex];
    if (!dungeon) {
      throw new Error(`Unknown dungeon index ${scenario.dungeonIndex}`);
    }
    return dungeon;
  }
  return e1m5;
};

const boardSize = (): BrowserBenchmarkBoardSize => {
  const container = document.getElementById('gameBoardContainer');
  if (!container) throw new Error('The game board is not mounted');
  const rect = container.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    canvases: [...container.querySelectorAll('canvas')].map((canvas) => ({
      id: canvas.id,
      width: canvas.width,
      height: canvas.height,
    })),
  };
};

const ready = async (): Promise<BrowserBenchmarkBoardSize> => {
  const deadline = performance.now() + 15000;
  while (performance.now() < deadline) {
    const size = boardSize();
    if (
      get(gameStateStore) &&
      get(appPhaseStore) === 'game' &&
      size.width > 0 &&
      size.height > 0 &&
      size.canvases.length > 0 &&
      size.canvases.every((canvas) => canvas.width > 0 && canvas.height > 0)
    ) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      return boardSize();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('The game board did not become ready');
};

const loadScenario = async (
  scenario: BrowserBenchmarkScenario = {},
): Promise<BrowserBenchmarkBoardSize> => {
  const campaignId = scenario.campaignId ?? 'iceDragonTreasure';
  updateAppSettings({
    musicOn: false,
    sfxOn: false,
    musicVolume: 0,
    sfxVolume: 0,
    debugOn: false,
    renderMode: scenario.projection ?? 'topDown',
  });
  const state: GameState = createExploredState(
    getScenarioDungeon(scenario, campaignId),
    {
      campaignId,
      seed: scenario.seed ?? 42,
      explored: scenario.explored,
    },
  );
  state.turnCount = 1;
  state.settings['music'] = false;
  state.settings['debug'] = false;
  loadGameState(state);
  return ready();
};

export const installBrowserBenchmarkHarness = (): void => {
  window.__drakriddarnaPerf = { loadScenario, ready, boardSize };
};
