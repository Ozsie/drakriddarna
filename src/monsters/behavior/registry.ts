import type { MonsterBehavior } from './types';

const monsterBehaviors: Record<string, MonsterBehavior[]> = {};

/**
 * Register a set of behaviors for a monster type.
 * Allows custom monsters (e.g. in campaigns) or overrides for standard monsters.
 */
export const registerMonsterBehaviors = (
  type: string,
  behaviors: MonsterBehavior[],
): void => {
  monsterBehaviors[type] = behaviors;
};

/**
 * Returns the explicitly registered behaviors for the given monster type,
 * or undefined if not registered.
 */
export const getMonsterBehaviors = (
  type: string,
): MonsterBehavior[] | undefined => monsterBehaviors[type];

/**
 * Checks whether custom behaviors have been registered for the given monster type.
 */
export const hasMonsterBehaviors = (type: string): boolean =>
  Boolean(monsterBehaviors[type]);

/**
 * Clears all registered custom monster behaviors.
 * Useful for test isolation and resetting registry state.
 */
export const clearMonsterBehaviors = (): void => {
  for (const key of Object.keys(monsterBehaviors)) {
    delete monsterBehaviors[key];
  }
};
