import type { GameState } from '../types';
import { isSamePosition, i18n } from '../core';
import { drawLabelBox } from '@hoard-engine/scene';

export { drawLabelBox as renderTextBox } from '@hoard-engine/scene';
export const renderNotes = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  if (debugMode) {
    state.dungeon.layout.notes.forEach((note) => {
      ctx.font = '7px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText(
        'N',
        note.position.x * cellSize + cellSize / 2,
        note.position.y * cellSize + cellSize / 2,
      );
      ctx.fillStyle = 'rgba(120, 50, 5, 0.12)';
      ctx.fillRect(
        note.position.x * cellSize,
        note.position.y * cellSize,
        cellSize,
        cellSize,
      );
    });
  }
  if (!state.currentActor) return;
  const actor = state.currentActor;
  const note = state.dungeon.layout.notes.find((note) =>
    isSamePosition(note.position, actor.position),
  );
  if (note) {
    const onHiddenDoor = state.dungeon.layout.doors.some(
      (door) =>
        door.hidden &&
        isSamePosition(note.position, {
          x: door.x,
          y: door.y,
        }),
    );
    if (!onHiddenDoor) {
      const text = i18n(note.message);
      drawLabelBox(ctx, text, note.position, cellSize);
    }
  }
};
