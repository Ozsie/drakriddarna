<script>
  import {
    toArray
  } from "./game.ts";
  import { onMount } from "svelte";
  import { Side } from "./types.ts";
  import groundSprites from '$lib/Dungeon_Tileset.png';
  import actorSprites from '$lib/Dungeon_Character_2.png';
  import { EMPTY, WALL } from "./dungeons.ts";
  import { doMouseLogic } from "../hero/ClickInputLogic.ts";
  import { browser } from '$app/environment';
  import { renderSecrets } from "./secrets/SecretsRendering.ts";
  import { renderHeroes } from "../hero/HeroRendering";
  import { renderMonsters } from "../monsters/MonsterRendering.ts";
  export let state;
  export let debugMode = true;

  let footerSize;
  let screenSize;
  const cellSize = 48;

  if (browser) {
    screenSize = window.innerHeight;
    footerSize = document.getElementById('footer').offsetHeight;
  }

  onMount(() => {
    const ground = new Image();
    ground.src = groundSprites;

    const actors = new Image();
    actors.src = actorSprites;

    render(ground, actors);
    setInterval(() => render(ground, actors), 10);
  });

  const render = (ground, actors) => {
    if (!state || !document) return;
    const c = document.getElementById("gameBoard");
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, c.width, c.height);
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderFloor(ctx, cell, x, y, ground))
    });
    renderSecrets(ctx, ground, cellSize, state);
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderGrid(ctx, cell, x, y))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderDoor(ctx, cell, x, y))
    });
    renderMonsters(ctx, actors, cellSize, state, debugMode);
    renderHeroes(ctx, actors, cellSize, state, debugMode);
  }


  const renderHiddenCell = (ctx, x, y) => {
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    ctx.stroke();
  }

  const renderFloor = (ctx, cell, x, y, ground) => {
    if (isWall(cell) || !state.dungeon.discoveredRooms.includes(cell) && cell !== EMPTY) {
      if (state.dungeon.discoveredRooms.some((r) => neighbourOf(x, y, r))) {
        ctx.drawImage(ground, 48, 0, 48, 48, x * cellSize, y * cellSize, cellSize, cellSize);
      } else {
        renderHiddenCell(ctx, x, y);
      }
    } else if (!isEmpty(cell)) {
      ctx.drawImage(ground, 0, 0, 48, 48, x*cellSize, y*cellSize, cellSize, cellSize);
    } else {
      renderHiddenCell(ctx, x, y);
    }
  }

  const renderGrid = (ctx, cell, x, y) => {
    if (cell === EMPTY || cell === WALL) return;
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.rect(x * cellSize, y * cellSize, cellSize, cellSize);
    if (debugMode) {
      ctx.font = "7px Arial";
      ctx.fillText(x + "," + y, (x * cellSize) + 3, (y * cellSize) + (cellSize - 3));
    }
    ctx.stroke();
  }

  const renderDoor = (ctx, cell, x, y) => {
    const door = findDoor(x, y)
    if (door && !door.hidden && !door.open && !isEmpty(cell)) {
      ctx.fillStyle = 'brown';
      switch (door.side) {
        case Side.RIGHT: {
          ctx.fillRect((x * cellSize) + (cellSize - 2), y * cellSize, 4, cellSize);
          if (door.locked && debugMode) {
            ctx.fillStyle = 'grey'
            ctx.fillRect((x*cellSize) + (cellSize - 4), (y*cellSize)+((cellSize/2) - 4), 8, 8)
          }
          if (door.trapped && debugMode) {
            ctx.fillStyle = 'red'
            ctx.fillRect((x*cellSize) + (cellSize - 4), (y*cellSize)+((cellSize/2) - 4), 4, 4)
          }
          break;
        }
        case Side.LEFT: {
          ctx.fillRect((x * cellSize)-2, y * cellSize, 4, cellSize);
          if (door.locked && debugMode) {
            ctx.fillStyle = 'grey'
            ctx.fillRect((x*cellSize)-4, (y*cellSize)+((cellSize/2) - 4), 8, 8)
          }
          if (door.trapped && debugMode) {
            ctx.fillStyle = 'red'
            ctx.fillRect((x*cellSize)-4, (y*cellSize)+((cellSize/2) - 4), 4, 4)
          }
          break;
        }
        case Side.UP: {
          ctx.fillRect(x * cellSize, (y * cellSize) - 2, cellSize, 4);
          if (door.locked && debugMode) {
            ctx.fillStyle = 'grey'
            ctx.fillRect((x*cellSize)+((cellSize/2) - 4), (y*cellSize)-4, 8, 8)
          }
          if (door.trapped && debugMode) {
            ctx.fillStyle = 'red'
            ctx.fillRect((x*cellSize)+((cellSize/2) - 4), (y*cellSize)-4, 4, 4)
          }
          break;
        }
        case Side.DOWN: {
          ctx.fillRect(x * cellSize, (y * cellSize) + (cellSize - 2), cellSize, 4);
          if (door.locked && debugMode) {
            ctx.fillStyle = 'grey'
            ctx.fillRect((x*cellSize)+((cellSize/2) - 4), (y*cellSize)+(cellSize - 4), 8, 8)
          }
          if (door.trapped && debugMode) {
            ctx.fillStyle = 'red'
            ctx.fillRect((x*cellSize)+((cellSize/2) - 4), (y*cellSize)+(cellSize - 4), 4, 4)
          }
          break;
        }
      }
    }
  }

  const isEmpty = (cell) => cell === EMPTY || !state.dungeon.discoveredRooms.includes(cell);
  const isWall = (cell) => cell === WALL;
  const findDoor = (x, y) => state.dungeon.layout.doors.find((door) => door.x === x && door.y === y)

  const neighbourOf = (x, y, value) => {
    if (!state) return;
    const xMin = Math.max(x-1, 0);
    const yMin = Math.max(y-1, 0);
    const xMax = Math.min(x+1, state.dungeon.layout.grid.length)
    const yMax = Math.min(y+1, state.dungeon.layout.grid[0].length)
    for (let pX = xMin; pX <= xMax; pX++) {
      for (let pY = yMin; pY <= yMax; pY++) {
        const row = state.dungeon.layout.grid[pY];
        const valueAt = toArray(row)[pX];
        if (valueAt === value) return true;
      }
    }
    return false;
  }

  const onClick = (event) => {
    doMouseLogic(event, cellSize, state);
  }

  const getStyle = () => {
    const maxHeight = screenSize - footerSize - 20;
    return `max-height: ${maxHeight}px; max-width: ${cellSize * 40}`;
  }
</script>
<style>
  .dungeon {
      background: yellow;
      overflow: scroll;
      height: 80%;
  }
</style>
<div style="{getStyle()}" class="dungeon">
  <canvas width="{cellSize * 40}" height="{cellSize * 30}" id="gameBoard" on:click="{onClick}"></canvas>
</div>