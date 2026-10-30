import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  appPhaseStore,
  welcomeViewStore,
  enterGamePhase,
  enterWelcomePhase,
  setWelcomeView,
  type WelcomeView,
} from './appPhaseStore';

describe('appPhaseStore', () => {
  beforeEach(() => {
    enterWelcomePhase();
  });

  it('starts in the welcome phase on its main view', () => {
    enterWelcomePhase();
    expect(get(appPhaseStore)).toBe('welcome');
    expect(get(welcomeViewStore)).toBe('main');
  });

  it('enterGamePhase switches to the game phase without touching the view', () => {
    setWelcomeView('settings');
    enterGamePhase();
    expect(get(appPhaseStore)).toBe('game');
    // The welcome view is meaningless in the game phase; it keeps its value
    // so returning to the welcome phase resets explicitly.
    expect(get(welcomeViewStore)).toBe('settings');
  });

  it('enterWelcomePhase resets to the main view', () => {
    enterGamePhase();
    setWelcomeView('credits');
    enterWelcomePhase();
    expect(get(appPhaseStore)).toBe('welcome');
    expect(get(welcomeViewStore)).toBe('main');
  });

  it('setWelcomeView switches between all welcome views', () => {
    const views: WelcomeView[] = [
      'main',
      'settings',
      'credits',
      'heroSelection',
    ];
    for (const view of views) {
      setWelcomeView(view);
      expect(get(welcomeViewStore)).toBe(view);
    }
    expect(get(appPhaseStore)).toBe('welcome');
  });
});
