import type { GameState, Hero, Monster } from '../../types';
import type { PassableGrid } from '../pathfinding';

export type SlotAction =
  | 'melee'
  | 'shoot'
  | 'move'
  | 'move_away'
  | 'move_to_cover'
  | 'hold'
  | 'fire_spray'
  | 'move_or_melee';

export type BehaviorTag = 'aggressive' | 'defensive' | 'ranged';

export type DirectorState = 'EASE' | 'PUSH' | 'NEUTRAL';

export interface BehaviorContext {
  state: GameState;
  monster: Monster;
  passableGrid: PassableGrid;
  neighbouringHeroes: Hero[];
  visibleHeroes: Hero[];
  partyHpPercentage: number;
  hasDeadHero: boolean;
  aliveMonsterCount: number;
  directorState: DirectorState;
}

export interface MonsterBehavior {
  name: string;
  slots: [SlotAction, SlotAction];
  tags: BehaviorTag[];
  isEligible: (context: BehaviorContext) => boolean;
  getBaseWeight: (context: BehaviorContext) => number;
}

export interface EvaluatedBehavior {
  name: string;
  slots: [SlotAction, SlotAction];
  tags: BehaviorTag[];
  eligible: boolean;
  baseWeight: number;
  finalWeight: number;
  ineligibleReason?: string;
}

export interface BehaviorDecision {
  monster: Monster;
  temperament: 'bold' | 'wary';
  directorState: DirectorState;
  passiveStreak: number;
  forgotBowThisTurn: boolean;
  evaluatedBehaviors: EvaluatedBehavior[];
  chosenBehavior: MonsterBehavior;
}
