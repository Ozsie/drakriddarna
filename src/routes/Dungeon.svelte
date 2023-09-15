<script>
  import { toArray } from './game.ts';
  import { onMount } from "svelte";
  import { MonsterType, Side } from "./types.ts";
  import groundSprites from '$lib/Dungeon_Tileset.png';
  import actorSprites from '$lib/Dungeon_Character_2.png';
  export let state

  const cellSize = 48;
  export let debugMode = true;

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
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderFloor(ctx, cell, x, y, ground))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderGrid(ctx, cell, x, y))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderDoor(ctx, cell, x, y))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderActors(ctx, cell, x, y, actors))
    });
  }


  const renderFloor = (ctx, cell, x, y, ground) => {
    if (!isEmpty(cell)) {
      ctx.drawImage(ground, 0, 7*16, 16, 16, x*cellSize, y*cellSize, cellSize, cellSize);
    } else {
      ctx.beginPath();
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'black'
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      ctx.stroke();
    }
  }

  const renderGrid = (ctx, cell, x, y) => {
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

  const renderActorBar = (ctx, actor, x, y) => {
    ctx.beginPath();
    ctx.strokeStyle = actor.colour;
    ctx.fillStyle = actor.colour;
    ctx.fillRect((x * cellSize) + 4, (y * cellSize) + (cellSize - 6), cellSize - 8, 4);
    ctx.stroke();
  }

  const renderLineOfSight = (ctx, from, to, state) => {
    if (debugMode) {
      to.forEach((target) => {
        const sX = from.position.x;
        const sY = from.position.y;
        const eX = target.position.x;
        const eY = target.position.y;

        ctx.strokeStyle = from.colour;
        ctx.beginPath();
        ctx.moveTo(sX * cellSize + (cellSize / 2), sY * cellSize + (cellSize / 2));
        ctx.lineTo(eX * cellSize + (cellSize / 2), eY * cellSize + (cellSize / 2));
        ctx.stroke();
      });
    }
  }

  const  renderHealthBar = (ctx, actor, x, y) => {
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'red';
    ctx.fillRect((x * cellSize) + 4, y*cellSize, (cellSize - 8), 4);
    ctx.fillStyle = 'green';
    ctx.fillRect((x * cellSize) + 4, y*cellSize, (cellSize - 8) * (actor.health/actor.maxHealth), 4);
    ctx.rect((x * cellSize) + 4, y*cellSize, (cellSize - 8), 4);
    ctx.stroke();
  }

  const renderActors = (ctx, cell, x, y, actors) => {
    ctx.beginPath();
    const hero = state.heroes.find((hero) => hero.position.x === x && hero.position.y === y)
    if (hero) {
      ctx.drawImage(actors, 4*16, 0, 16, 16, x*cellSize, y*cellSize, cellSize, cellSize);
      renderActorBar(ctx, hero, x, y);
      renderHealthBar(ctx, hero, x, y);
      ctx.stroke();
    } else {
      const monster = state.dungeon.layout.monsters.find((monster) => monster.position.x === x && monster.position.y === y);
      if (monster && monster.health > 0 && !isEmpty(cell)) {
        switch (monster.type) {
          case MonsterType.ORCH: ctx.drawImage(actors, cellSize, 16, 16, 16, x * cellSize, y * cellSize, cellSize, cellSize); break;
          case MonsterType.TROLL: ctx.drawImage(actors, cellSize, 16, 16, 16, x * cellSize, y * cellSize, cellSize, cellSize); break;
          default: ctx.drawImage(actors, 16, 16, 16, 16, x * cellSize, y * cellSize, cellSize, cellSize); break;
        }
        renderActorBar(ctx, monster, x, y);
        renderHealthBar(ctx, monster, x, y);
        renderLineOfSight(ctx, monster, state.heroes, state);
      }
    }
    ctx.stroke();
  }

  const isEmpty = (cell) => cell === ' ' || !state.dungeon.discoveredRooms.includes(cell);
  const findDoor = (x, y) => state.dungeon.layout.doors.find((door) => door.x === x && door.y === y)
</script>
<canvas width="860" height="750" id="gameBoard"></canvas>