import { writable } from 'svelte/store';
import type { RadialAction } from '../hero/RadialMenuLogic';

export type RadialMenuState = {
  x: number;
  y: number;
  actions: RadialAction[];
} | null;

export const radialMenuStore = writable<RadialMenuState>(null);
