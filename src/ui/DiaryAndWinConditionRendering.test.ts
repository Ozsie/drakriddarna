/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  formatWinCondition,
  formatDiaryHeader,
  formatNoteHeader,
  formatNoteMessage,
  measureTextWidth,
  wrapText,
  getDiaryAndWinConditionsLayout,
  renderDiaryAndWinConditions,
} from './DiaryAndWinConditionRendering';
import {
  ConditionType,
  MonsterType,
  type GameState,
  type Note,
  type WinCondition,
} from '../types';

const createMockCtx = (): CanvasRenderingContext2D => {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 8,
    })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
  return ctx;
};

const createMockState = (overrides?: Partial<GameState>): GameState =>
  ({
    turnCount: 4,
    dungeon: {
      name: 'Test Dungeon',
      level: 1,
      killCount: 2,
      beaten: false,
      discoveredRooms: ['room-1'],
      startingPositions: [{ x: 1, y: 1 }],
      winConditions: [
        {
          type: ConditionType.KILL_AT_LEAST,
          killMinCount: 5,
          fulfilled: false,
        },
        {
          type: ConditionType.REACH_CELL,
          targetCell: { x: 5, y: 5 },
          fulfilled: true,
        },
      ],
      layout: {
        grid: [],
        doors: [],
        monsters: [],
        secrets: [],
        notes: [
          {
            id: 'note-1',
            message: 'Ancient inscription found.',
            position: { x: 2, y: 3 },
            found: true,
            foundOn: 1,
          },
          {
            id: 'note-2',
            message: 'Beware the shadow dragon!',
            position: { x: 4, y: 6 },
            found: true,
            foundOn: 3,
          },
          {
            id: 'note-3',
            message: 'Unfound note.',
            position: { x: 7, y: 8 },
            found: false,
          },
        ],
        items: [],
        corridors: [],
        corners: [],
      },
    },
    heroes: [],
    settings: {},
    actionLog: [],
    ...overrides,
  }) as unknown as GameState;

describe('DiaryAndWinConditionRendering', () => {
  describe('formatWinCondition', () => {
    it('formats KILL_ALL condition', () => {
      const cond: WinCondition = {
        type: ConditionType.KILL_ALL,
        fulfilled: false,
      };
      const text = formatWinCondition(cond);
      expect(text).toContain('Kill all monsters');
    });

    it('formats KILL_ALL_OF_TYPE condition', () => {
      const cond: WinCondition = {
        type: ConditionType.KILL_ALL_OF_TYPE,
        targetMonsterType: MonsterType.ORC,
        fulfilled: false,
      };
      const text = formatWinCondition(cond);
      expect(text).toContain('Orc');
    });

    it('formats KILL_AT_LEAST condition with kill progress count', () => {
      const cond: WinCondition = {
        type: ConditionType.KILL_AT_LEAST,
        killMinCount: 4,
        fulfilled: false,
      };
      const text = formatWinCondition(cond, 3);
      expect(text).toContain('3/4');
    });

    it('formats OPEN_DOOR condition', () => {
      const cond: WinCondition = {
        type: ConditionType.OPEN_DOOR,
        fulfilled: false,
      };
      const text = formatWinCondition(cond);
      expect(text).toContain('Open');
    });

    it('formats REACH_CELL condition', () => {
      const cond: WinCondition = {
        type: ConditionType.REACH_CELL,
        targetCell: { x: 1, y: 1 },
        fulfilled: false,
      };
      const text = formatWinCondition(cond);
      expect(text).toContain('Reach');
    });

    it('formats SECRET_FOUND condition', () => {
      const cond: WinCondition = {
        type: ConditionType.SECRET_FOUND,
        fulfilled: false,
      };
      const text = formatWinCondition(cond);
      expect(text).toContain('secret');
    });

    it('appends additionalDescription when present', () => {
      const cond: WinCondition = {
        type: ConditionType.REACH_CELL,
        additionalDescription:
          'content.winConditions.additional.requiresNecklace',
        fulfilled: false,
      };
      const text = formatWinCondition(cond);
      expect(text).toContain('Reach');
      expect(text).toContain('Necklace');
    });
  });

  describe('formatDiaryHeader and formatNoteHeader', () => {
    it('formats diary header with turn count', () => {
      expect(formatDiaryHeader(5)).toContain('5');
    });

    it('formats note header with foundOn round', () => {
      const note: Note = {
        message: 'Test message',
        position: { x: 0, y: 0 },
        found: true,
        foundOn: 3,
      };
      expect(formatNoteHeader(note)).toContain('3');
    });

    it('formats note message correctly', () => {
      const note: Note = {
        message: 'A secret is revealed.',
        position: { x: 0, y: 0 },
        found: true,
      };
      expect(formatNoteMessage(note)).toBe('A secret is revealed.');
    });
  });

  describe('measureTextWidth and wrapText', () => {
    it('measures text with canvas ctx', () => {
      const ctx = createMockCtx();
      const width = measureTextWidth(ctx, 'Hello World');
      expect(width).toBe(11 * 8);
    });

    it('wraps text when exceeding max width', () => {
      const ctx = createMockCtx();
      const lines = wrapText(ctx, 'One two three four five six', 60);
      expect(lines.length).toBeGreaterThan(1);
    });

    it('keeps single line if within max width', () => {
      const ctx = createMockCtx();
      const lines = wrapText(ctx, 'Short', 100);
      expect(lines).toEqual(['Short']);
    });
  });

  describe('getDiaryAndWinConditionsLayout', () => {
    it('returns empty layout when no state is provided', () => {
      const layout = getDiaryAndWinConditionsLayout(600, 400, null);
      expect(layout.hasContent).toBe(false);
      expect(layout.winConditions).toHaveLength(0);
      expect(layout.diaryNotes).toHaveLength(0);
    });

    it('positions panel in top right under the turn counter', () => {
      const state = createMockState();
      const ctx = createMockCtx();
      const viewWidth = 800;
      const viewHeight = 600;

      const layout = getDiaryAndWinConditionsLayout(
        viewWidth,
        viewHeight,
        state,
        ctx,
      );

      expect(layout.hasContent).toBe(true);
      expect(layout.bounds.y).toBe(46); // Just under top bar (y: 8, height: 32 + 6px gap)
      expect(layout.bounds.x + layout.bounds.width).toBeLessThanOrEqual(
        viewWidth - 8,
      );
      expect(layout.bounds.x).toBeGreaterThan(viewWidth / 2);
    });

    it('sorts win conditions with unfulfilled first and fulfilled last', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      const layout = getDiaryAndWinConditionsLayout(800, 600, state, ctx);

      expect(layout.winConditions).toHaveLength(2);
      expect(layout.winConditions[0].fulfilled).toBe(false);
      expect(layout.winConditions[1].fulfilled).toBe(true);
    });

    it('filters found notes and sorts them in descending turn order', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      const layout = getDiaryAndWinConditionsLayout(800, 600, state, ctx);

      // Should only contain note-2 (turn 3) and note-1 (turn 1), in descending order (3, then 1)
      expect(layout.diaryNotes).toHaveLength(2);
      expect(layout.diaryNotes[0].turn).toBe(3);
      expect(layout.diaryNotes[0].message).toContain('shadow dragon');
      expect(layout.diaryNotes[1].turn).toBe(1);
      expect(layout.diaryNotes[1].message).toContain('Ancient inscription');
    });
  });

  describe('renderDiaryAndWinConditions', () => {
    it('renders panel background, win conditions, diary header, and notes', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderDiaryAndWinConditions(ctx, 800, 600, state);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('draws strikethrough for fulfilled win conditions', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderDiaryAndWinConditions(ctx, 800, 600, state);

      // moveTo and lineTo should be called for strikethrough and dividers
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
    });

    it('does not crash or draw when state has no conditions or notes', () => {
      const state = createMockState({
        dungeon: {
          name: 'Empty',
          level: 1,
          killCount: 0,
          beaten: false,
          discoveredRooms: [],
          startingPositions: [],
          winConditions: [],
          layout: {
            grid: [],
            doors: [],
            monsters: [],
            secrets: [],
            notes: [],
            items: [],
            corridors: [],
            corners: [],
          },
        },
      } as unknown as Partial<GameState>);
      const ctx = createMockCtx();

      renderDiaryAndWinConditions(ctx, 800, 600, state);

      expect(ctx.fill).not.toHaveBeenCalled();
    });
  });
});
