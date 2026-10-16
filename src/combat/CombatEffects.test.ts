import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createBloodSplatter,
  createFlameEffect,
  createProjectile,
  renderBloodSplatters,
  renderFlameEffects,
  renderProjectiles,
  renderActorFlash,
  BLOOD_SPLATTER_DURATION_MS,
  FLAME_EFFECT_DURATION_MS,
} from './CombatEffects';
import {
  flashActor,
  getActorFlashIntensity,
  isActorFlashing,
  clearActorAnimations,
  isActorAnimating,
  hasActiveActorAnimations,
} from '../core/ActorAnimation';
import { takeDamage } from '../core/combat';
import { resolveChaosSwordAttack } from '../items/ItemLogic';
import type { Actor, GameState, Hero, Monster } from '../types';
import { Colour, Level, MonsterType } from '../types';
import { resetRng, setRng } from '../core/dice';
import { weapons, monsterWeapons } from '../items/weapons';
import { createMonster } from '../dungeon/DungeonLogic';

const createMockCtx = () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const arcMock = vi.fn(
    (
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise?: boolean,
    ) =>
      calls.push({
        method: 'arc',
        args: [x, y, radius, startAngle, endAngle, counterclockwise],
      }),
  );
  const fillRectMock = vi.fn((x: number, y: number, w: number, h: number) =>
    calls.push({ method: 'fillRect', args: [x, y, w, h] }),
  );
  const ctx = {
    save: vi.fn(() => calls.push({ method: 'save', args: [] })),
    restore: vi.fn(() => calls.push({ method: 'restore', args: [] })),
    beginPath: vi.fn(() => calls.push({ method: 'beginPath', args: [] })),
    rect: vi.fn((x: number, y: number, w: number, h: number) =>
      calls.push({ method: 'rect', args: [x, y, w, h] }),
    ),
    clip: vi.fn(() => calls.push({ method: 'clip', args: [] })),
    fillRect: fillRectMock,
    arc: arcMock,
    fill: vi.fn(() => calls.push({ method: 'fill', args: [] })),
    moveTo: vi.fn((x: number, y: number) =>
      calls.push({ method: 'moveTo', args: [x, y] }),
    ),
    lineTo: vi.fn((x: number, y: number) =>
      calls.push({ method: 'lineTo', args: [x, y] }),
    ),
    stroke: vi.fn(() => calls.push({ method: 'stroke', args: [] })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    shadowColor: '',
    shadowBlur: 0,
    calls,
  };
  return ctx as unknown as CanvasRenderingContext2D & {
    calls: typeof calls;
    arc: typeof arcMock;
    fillRect: typeof fillRectMock;
    save: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    clip: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
  };
};

const createTestState = (): GameState => ({
  heroes: [],
  dungeon: {
    name: 'Test Dungeon',
    intro: 'intro',
    discoveredRooms: ['A'],
    layout: {
      grid: ['AAA', 'AAA', 'AAA'],
      doors: [],
      secrets: [],
      monsters: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
      pillars: [],
      pits: [],
    },
    startingPositions: [{ x: 1, y: 1 }],
    winConditions: [],
    beaten: false,
    killCount: 0,
  },
  actionLog: [],
  itemDeck: [],
  magicItemDeck: [],
  settings: { cellSize: 48 },
  eventDeck: [],
  reRender: false,
  drawEvents: true,
});

describe('CombatEffects', () => {
  beforeEach(() => {
    resetRng();
    clearActorAnimations();
  });

  afterEach(() => {
    resetRng();
    clearActorAnimations();
  });

  describe('Blood Splatter Particle Effect', () => {
    it('createBloodSplatter generates particles with random angles, speeds, colors and duration', () => {
      const splatter = createBloodSplatter({ x: 2, y: 3 }, { damage: 3 });
      expect(splatter.id).toMatch(/^blood-/);
      expect(splatter.position).toEqual({ x: 2, y: 3 });
      expect(splatter.durationMs).toBe(BLOOD_SPLATTER_DURATION_MS);
      expect(splatter.particles.length).toBeGreaterThanOrEqual(10);
      splatter.particles.forEach((p) => {
        expect(p.angle).toBeGreaterThanOrEqual(0);
        expect(p.angle).toBeLessThanOrEqual(Math.PI * 2);
        expect(p.radius).toBeGreaterThan(0);
        expect(p.color).toBeDefined();
        expect(p.distance).toBeGreaterThan(0);
      });
    });

    it('renderBloodSplatters draws active particles and fades them over time', () => {
      const ctx = createMockCtx();
      const state = createTestState();
      const now = 1000;
      const splatter = createBloodSplatter(
        { x: 1, y: 1 },
        { timestamp: now, durationMs: 500, particleCount: 5 },
      );
      state.bloodSplatters = [splatter];

      // At start (elapsed = 0)
      const activeStart = renderBloodSplatters(ctx, 48, state, now);
      expect(activeStart).toBe(true);
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();

      // Midway (elapsed = 250ms)
      const activeMid = renderBloodSplatters(ctx, 48, state, now + 250);
      expect(activeMid).toBe(true);

      // Finished (elapsed = 600ms > duration)
      ctx.arc.mockClear();
      const activeEnd = renderBloodSplatters(ctx, 48, state, now + 600);
      expect(activeEnd).toBe(false);
      expect(ctx.arc).not.toHaveBeenCalled();
    });

    it('renderBloodSplatters waits for future timestamp when scheduled (e.g. projectile in-flight)', () => {
      const ctx = createMockCtx();
      const state = createTestState();
      const now = 1000;
      const futureTime = 1200;
      const splatter = createBloodSplatter(
        { x: 1, y: 1 },
        { timestamp: futureTime, durationMs: 500 },
      );
      state.bloodSplatters = [splatter];

      // At currentTime = 1000 (before future timestamp), it remains active in queue but doesn't draw yet
      const isActive = renderBloodSplatters(ctx, 48, state, now);
      expect(isActive).toBe(true);
      expect(ctx.arc).not.toHaveBeenCalled();

      // At currentTime = 1250 (after impact), it draws particles
      const isDrawing = renderBloodSplatters(ctx, 48, state, now + 250);
      expect(isDrawing).toBe(true);
      expect(ctx.arc).toHaveBeenCalled();
    });
  });

  describe('Sprite Flash Animation', () => {
    it('flashActor triggers flash intensity and eases down to 0 over duration', () => {
      const actor: Actor = {
        name: 'Hero',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 1,
        health: 5,
        maxHealth: 5,
        colour: Colour.Red,
        experience: 0,
        position: { x: 1, y: 1 },
        level: Level.APPRENTICE,
        weapon: weapons[0],
        inventory: [],
      };

      const now = 1000;
      expect(isActorFlashing(actor, now)).toBe(false);
      expect(getActorFlashIntensity(actor, now)).toBe(0);

      flashActor(actor, 200, now);
      expect(isActorFlashing(actor, now)).toBe(true);
      expect(getActorFlashIntensity(actor, now)).toBe(1);
      expect(isActorAnimating(actor, now)).toBe(true);
      expect(hasActiveActorAnimations(now)).toBe(true);

      // Halfway through flash (100ms)
      expect(getActorFlashIntensity(actor, now + 100)).toBeCloseTo(0.5);

      // Flash ended (201ms)
      expect(getActorFlashIntensity(actor, now + 201)).toBe(0);
      expect(isActorFlashing(actor, now + 201)).toBe(false);
    });

    it('renderActorFlash clips sprite area and applies source-atop white highlight', () => {
      const ctx = createMockCtx();
      const actor: Actor = {
        name: 'Hero',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 1,
        health: 5,
        maxHealth: 5,
        colour: Colour.Red,
        experience: 0,
        position: { x: 2, y: 3 },
        level: Level.APPRENTICE,
        weapon: weapons[0],
        inventory: [],
      };

      const now = 1000;
      flashActor(actor, 200, now);

      renderActorFlash(ctx, actor, 2, 3, 48, now);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledWith(2 * 48, 3 * 48, 32, 32);
      expect(ctx.restore).toHaveBeenCalled();

      // When not flashing, nothing is drawn
      ctx.fillRect.mockClear();
      renderActorFlash(ctx, actor, 2, 3, 48, now + 300);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('Ranged Bullet / Projectile Animation', () => {
    it('createProjectile initializes start/end positions and calculated duration based on distance', () => {
      const proj = createProjectile({ x: 1, y: 1 }, { x: 4, y: 5 });
      expect(proj.id).toMatch(/^proj-/);
      expect(proj.from).toEqual({ x: 1, y: 1 });
      expect(proj.to).toEqual({ x: 4, y: 5 });
      expect(proj.durationMs).toBeGreaterThan(0);
      expect(proj.color).toBeDefined();
    });

    it('renderProjectiles interpolates bullet position, draws motion trail and bullet head', () => {
      const ctx = createMockCtx();
      const state = createTestState();
      const now = 1000;
      const proj = createProjectile(
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { timestamp: now, durationMs: 200 },
      );
      state.projectiles = [proj];

      // At start (progress = 0)
      const isStartActive = renderProjectiles(ctx, 48, state, now);
      expect(isStartActive).toBe(true);
      expect(ctx.arc).toHaveBeenCalled();

      // Midway (progress = 0.5)
      ctx.arc.mockClear();
      const isMidActive = renderProjectiles(ctx, 48, state, now + 100);
      expect(isMidActive).toBe(true);
      expect(ctx.arc).toHaveBeenCalled();

      // End (progress > 1)
      ctx.arc.mockClear();
      const isEndActive = renderProjectiles(ctx, 48, state, now + 250);
      expect(isEndActive).toBe(false);
      expect(ctx.arc).not.toHaveBeenCalled();
    });
  });

  describe('Flame Effects', () => {
    it('createFlameEffect creates flame particle effect at position with correct properties', () => {
      const pos = { x: 3, y: 4 };
      const flame = createFlameEffect(pos, {
        durationMs: 400,
        particleCount: 15,
      });

      expect(flame.id).toContain('flame-');
      expect(flame.position).toEqual({ x: 3, y: 4 });
      expect(flame.durationMs).toBe(400);
      expect(flame.particles).toHaveLength(15);

      flame.particles.forEach((p) => {
        expect(p.radius).toBeGreaterThan(0);
        expect(p.speedY).toBeGreaterThan(0);
        expect(typeof p.color).toBe('string');
      });
    });

    it('renderFlameEffects draws flame particles while active and returns false when expired', () => {
      const ctx = createMockCtx();
      const state = createTestState();
      const now = 1000;
      const flame = createFlameEffect(
        { x: 2, y: 2 },
        { timestamp: now, durationMs: FLAME_EFFECT_DURATION_MS },
      );
      state.flameEffects = [flame];

      // At progress ~0.5
      const isActive = renderFlameEffects(ctx, 48, state, now + 300);
      expect(isActive).toBe(true);
      expect(ctx.arc).toHaveBeenCalled();

      // At expiration
      ctx.arc.mockClear();
      const isExpired = renderFlameEffects(
        ctx,
        48,
        state,
        now + FLAME_EFFECT_DURATION_MS + 100,
      );
      expect(isExpired).toBe(false);
      expect(ctx.arc).not.toHaveBeenCalled();
    });
  });

  describe('Combat Integration with Attacks and Damage', () => {
    it('takeDamage with damage > 0 spawns blood splatter, flash, and damage indicator', () => {
      // 5/6 ensures KNIGHT succeeds with 3 hits
      setRng(() => 5 / 6);

      const state = createTestState();
      const attacker: Actor = {
        name: 'Attacker',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 0,
        health: 10,
        maxHealth: 10,
        colour: Colour.Blue,
        experience: 0,
        position: { x: 1, y: 1 },
        level: Level.KNIGHT,
        weapon: weapons[0], // 3 dice
        inventory: [],
      };
      const defender: Actor = {
        name: 'Defender',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 0,
        health: 10,
        maxHealth: 10,
        colour: Colour.Red,
        experience: 0,
        position: { x: 1, y: 2 },
        level: Level.APPRENTICE,
        weapon: weapons[0],
        inventory: [],
      };
      state.heroes = [attacker, defender];

      takeDamage(state, attacker, defender, false);

      expect(defender.health).toBe(7); // 3 damage
      expect(isActorFlashing(defender)).toBe(true);
      expect(state.bloodSplatters).toBeDefined();
      expect(state.bloodSplatters?.length).toBe(1);
      expect(state.bloodSplatters?.[0].position).toEqual({ x: 1, y: 2 });
      expect(state.damageIndicators).toBeDefined();
      expect(state.damageIndicators?.length).toBe(1);
      expect(state.damageIndicators?.[0].damage).toBe(3);
    });

    it('takeDamage with NO damage (0) shows ONLY sprite flash and NO blood splatter particles', () => {
      // 0/6 ensures attack misses (0 hits)
      setRng(() => 0);

      const state = createTestState();
      const attacker: Actor = {
        name: 'Attacker',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 0,
        health: 10,
        maxHealth: 10,
        colour: Colour.Blue,
        experience: 0,
        position: { x: 1, y: 1 },
        level: Level.APPRENTICE,
        weapon: weapons[0],
        inventory: [],
      };
      const defender: Actor = {
        name: 'Defender',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 2,
        health: 10,
        maxHealth: 10,
        colour: Colour.Red,
        experience: 0,
        position: { x: 1, y: 2 },
        level: Level.APPRENTICE,
        weapon: weapons[0],
        inventory: [],
      };
      state.heroes = [attacker, defender];

      takeDamage(state, attacker, defender, false);

      expect(defender.health).toBe(10); // 0 damage
      expect(isActorFlashing(defender)).toBe(true); // Flash is shown!
      expect(state.bloodSplatters ?? []).toHaveLength(0); // NO blood splatter!
      expect(state.damageIndicators?.[0]?.damage).toBe(0);
    });

    it('ranged attack moves a bullet from attacker to target and synchronizes impact effects', () => {
      setRng(() => 5 / 6);

      const state = createTestState();
      const attacker: Monster = {
        name: 'Orc Archer',
        type: MonsterType.ORC,
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 0,
        health: 10,
        maxHealth: 10,
        colour: Colour.Green,
        experience: 1,
        position: { x: 1, y: 1 },
        level: Level.KNIGHT,
        weapon: monsterWeapons[0],
        rangedWeapon: monsterWeapons[1], // orc_bow
        inventory: [],
      };
      const target: Hero = {
        name: 'Fearik',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 0,
        health: 10,
        maxHealth: 10,
        colour: Colour.Blue,
        experience: 0,
        position: { x: 5, y: 1 },
        level: Level.APPRENTICE,
        weapon: weapons[0],
        inventory: [],
        isInventoryOpen: false,
      };
      state.heroes = [target];
      state.dungeon.layout.monsters = [attacker];

      takeDamage(state, attacker, target, true);

      // Projectile is created
      expect(state.projectiles).toBeDefined();
      expect(state.projectiles?.length).toBe(1);
      const proj = state.projectiles![0];
      expect(proj.from).toEqual({ x: 1, y: 1 });
      expect(proj.to).toEqual({ x: 5, y: 1 });

      // Blood and damage indicator are timed to bullet arrival (timestamp = proj.timestamp + duration)
      expect(state.bloodSplatters?.length).toBe(1);
      const blood = state.bloodSplatters![0];
      expect(blood.timestamp).toBe(
        (proj.timestamp ?? 0) + (proj.durationMs ?? 0),
      );
    });

    it('resolveChaosSwordAttack spawns blood splatter and flash when target is hit or killed', () => {
      setRng(() => 0); // 0 hits triggers chaos sword instant kill

      const state = createTestState();
      const hero: Hero = {
        name: 'Fearik',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 0,
        health: 10,
        maxHealth: 10,
        colour: Colour.Blue,
        experience: 0,
        position: { x: 1, y: 1 },
        level: Level.APPRENTICE,
        weapon: weapons[0],
        inventory: [],
        isInventoryOpen: false,
      };
      const monster: Monster = {
        name: 'Orc',
        type: MonsterType.ORC,
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 0,
        health: 4,
        maxHealth: 4,
        colour: Colour.Green,
        experience: 1,
        position: { x: 1, y: 2 },
        level: Level.APPRENTICE,
        weapon: monsterWeapons[0],
        inventory: [],
      };
      state.heroes = [hero];
      state.dungeon.layout.monsters = [monster];

      resolveChaosSwordAttack(state, hero, monster);

      expect(monster.health).toBe(0);
      expect(isActorFlashing(monster)).toBe(true);
      expect(state.bloodSplatters?.length).toBe(1);
    });

    it('Dark Lord fire attack spawns flame effects in affected cells', async () => {
      setRng(() => 5 / 6);
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const state = createTestState();
      state.dungeon.discoveredRooms = ['A'];
      state.dungeon.layout.grid = ['AAAAA', 'AAAAA', 'AAAAA', 'AAAAA', 'AAAAA'];

      const darkLord = createMonster(
        MonsterType.YELLOW_DARK_LORD,
        Colour.Yellow,
        1,
        1,
      );
      darkLord.actions = 2;
      const hero1: Hero = {
        name: 'Hero 1',
        actions: 1,
        movement: 1,
        maxMovement: 1,
        defense: 0,
        health: 10,
        maxHealth: 10,
        colour: Colour.Blue,
        experience: 0,
        position: { x: 3, y: 3 }, // Diagonal
        level: Level.APPRENTICE,
        weapon: weapons[0],
        inventory: [],
        isInventoryOpen: false,
      };
      state.heroes = [hero1];
      state.dungeon.layout.monsters = [darkLord];

      // Run monsterActions
      const { monsterActions } = await import('../monsters/MonsterLogic');
      await monsterActions(state, {
        delayBetweenActions: 0,
        delayAfterAttack: 0,
        waitForMovement: false,
      });

      expect(state.flameEffects).toBeDefined();
      expect(state.flameEffects?.length).toBeGreaterThanOrEqual(1);
      expect(state.flameEffects?.[0].position).toEqual({ x: 3, y: 3 });
      randomSpy.mockRestore();
    });
  });
});
