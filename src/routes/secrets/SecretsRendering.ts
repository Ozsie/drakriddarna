import type { GameState, Secret } from "../types";
import { SecretType } from "../types";

export const renderSecrets = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, state: GameState) => {
  state.dungeon.layout.secrets
    .filter((secret) => secret.found)
    .forEach((secret) => {
      switch (secret.type) {
        case SecretType.TRAP_DOOR: renderTrapDoor(ctx, ground, cellSize, secret); break;
        default: renderFoundSecret(ctx, ground, cellSize, secret); break;
      }
    });
}

const renderTrapDoor = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, secret: Secret) => {
  const x = secret.position.x;
  const y = secret.position.y;
  ctx.drawImage(ground, 3*48, 0, 48, 48, x*cellSize, y*cellSize, cellSize, cellSize);
}

const renderFoundSecret = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, secret: Secret) => {
  const x = secret.position.x;
  const y = secret.position.y;
  ctx.drawImage(ground, 4*48, 0, 48, 48, x*cellSize, y*cellSize, cellSize, cellSize);
}
