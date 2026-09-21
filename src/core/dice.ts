import { Level } from '../types';

let rng: () => number = Math.random;

export const setRng = (customRng: () => number) => {
  rng = customRng;
};

export const resetRng = () => {
  rng = Math.random;
};

export const createSeededRng = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
};

export const roll = (level: Level, dice: number): number => {
  let results: number[] = [];
  for (let i = 0; i < dice; i++) {
    results.push(Math.floor(rng() * 6) + 1);
  }
  switch (level) {
    case Level.APPRENTICE:
      results = results.filter((result) => result === 5);
      break;
    case Level.KNIGHT:
    case Level.HERO:
      results = results.filter((result) => result >= 4);
      break;
    case Level.LORD:
    case Level.MASTER:
      results = results.filter((result) => result >= 3);
      break;
  }
  return results.length;
};

export const shuffle = <T>(array: T[]): T[] => {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(rng() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
};
