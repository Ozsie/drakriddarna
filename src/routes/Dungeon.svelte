<script>
  import { toArray } from './game.ts';
  import { onMount } from "svelte";
  import { Side } from "./types.ts";
  export let state

  onMount(() => {
    render();
    setInterval(render, 10)
  });

  const render = () => {
    if (!state || !document) return;
    const c = document.getElementById("gameBoard");
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderFloor(ctx, cell, x, y))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderGrid(ctx, cell, x, y))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderDoor(ctx, cell, x, y))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderActors(ctx, cell, x, y))
    });
  }


  const renderFloor = (ctx, cell, x, y) => {
    ctx.beginPath();
    if (!isEmpty(cell)) {
      ctx.fillStyle = 'lightgrey'
    } else {
      ctx.fillStyle = 'black'
    }
    ctx.fillRect(x * 32, y * 32, 32, 32);
    ctx.stroke();
  }

  const renderGrid = (ctx, cell, x, y) => {
    ctx.beginPath();
    ctx.rect(x * 32, y * 32, 32, 32);
    ctx.font = "7px Arial";
    ctx.fillText(x + ',' + y, (x * 32)+1, (y * 32)+30);
    ctx.stroke();
  }

  const renderDoor = (ctx, cell, x, y) => {
    const door = findDoor(x, y)
    if (door && !door.open && !isEmpty(cell)) {
      ctx.fillStyle = 'brown';
      switch (door.side) {
        case Side.RIGHT: ctx.fillRect((x * 32) + 30, y * 32, 4, 32); break;
        case Side.LEFT: ctx.fillRect((x * 32) - 34, y * 32, 4, 32); break;
        case Side.UP: ctx.fillRect(x * 32, (y * 32) - 2, 32, 4); break;
        case Side.DOWN: ctx.fillRect(x * 32, (y * 32) + 30, 32, 4); break;
      }
    }
  }

  const renderActors = (ctx, cell, x, y) => {
    ctx.beginPath();
    const hero = state.heroes.find((hero) => hero.position.x === x && hero.position.y === y)
    if (hero) {
      ctx.beginPath();
      ctx.arc((x*32)+16, (y*32)+16, 13, 0, 2 * Math.PI);
      ctx.fillStyle = hero.colour;
      ctx.fill();
    } else {
      const monster = state.dungeon.layout.monsters.find((monster) => monster.position.x === x && monster.position.y === y);
      if (monster && monster.health > 0 && !isEmpty(cell)) {
        ctx.beginPath();
        ctx.fillStyle = monster.colour;
        ctx.arc((x*32)+16, (y*32)+16, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = "7px Arial";
        ctx.fillStyle = 'black';
        ctx.fillText(monster.name[0], (x*32)+16, (y*32)+16)
      }
    }
    ctx.stroke();
  }

  const isEmpty = (cell) => cell === ' ' || !state.dungeon.discoveredRooms.includes(cell);
  const findDoor = (x, y) => state.dungeon.layout.doors.find((door) => door.x === x && door.y === y)
</script>
<canvas width="860" height="750" id="gameBoard"></canvas>