import { writable } from 'svelte/store';
import type { RadialMenuEntry } from '../hero/RadialMenuLogic';

export type RadialMenuState = {
  x: number;
  y: number;
  entries: RadialMenuEntry[];
} | null;

export const radialMenuStore = writable<RadialMenuState>(null);
