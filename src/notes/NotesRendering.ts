import type { GameState } from '../types';
import { i18n, isSamePosition } from '../game';

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
      const lines = text.match(/.{1,30}(?:\s|$)/g);

      const x = note.position.x * cellSize;
      const y = note.position.y * cellSize + cellSize;
      const height = Math.max(lines?.length ?? 0, 1) * (cellSize / 2.5);
      ctx.fillStyle = 'rgba(82,11,159,0.8)';
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize * 4, height, [0, 30, 30, 30]);
      ctx.stroke();
      ctx.fill();
      ctx.font = '12px Arial';
      ctx.fillStyle = 'wheat';
      lines?.forEach((line, index) => {
        ctx.fillText(line, x + 10, y + 14 * (index + 1));
      });
    }
  }
};
