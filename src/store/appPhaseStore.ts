import { writable } from 'svelte/store';

// Whether the app shows the welcome (title) screen or the game. The phase
// lives outside GameState on purpose: a fresh visit boots straight to the
// welcome screen without creating any game state, and the reloadGuard is
// the only thing that resumes a game automatically. The phase is never
// persisted — a fresh visit always starts at the welcome screen.

export type AppPhase = 'welcome' | 'game';

// The welcome screen's active sub view. Only meaningful while the phase is
// 'welcome'; 'heroSelection' is reached only from the new-game dialog and
// returns there on Back.
export type WelcomeView = 'main' | 'settings' | 'credits' | 'heroSelection';

export const appPhaseStore = writable<AppPhase>('welcome');

export const welcomeViewStore = writable<WelcomeView>('main');

/** Switches to the game phase (a run was started or a save loaded). */
export const enterGamePhase = (): void => {
  appPhaseStore.set('game');
};

/** Switches to the welcome phase, resetting to its main view. */
export const enterWelcomePhase = (): void => {
  appPhaseStore.set('welcome');
  welcomeViewStore.set('main');
};

/** Switches the welcome sub view (main/settings/credits/heroSelection). */
export const setWelcomeView = (view: WelcomeView): void => {
  welcomeViewStore.set(view);
};
