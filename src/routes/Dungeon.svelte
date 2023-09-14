<script>
  import { toArray } from './game.ts';
  import { onMount } from "svelte";
  import { MonsterType, Side } from "./types.ts";
  import groundSprites from '$lib/Dungeon_Tileset.png';
  import actorSprites from '$lib/Dungeon_Character_2.png';
  export let state

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
      ctx.drawImage(ground, 0, 7*16, 16, 16, x*64, y*64, 64, 64);
    } else {
      ctx.beginPath();
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'black'
      ctx.fillRect(x * 64, y * 64, 64, 64);
      ctx.stroke();
    }
  }

  const renderGrid = (ctx, cell, x, y) => {
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.rect(x * 64, y * 64, 64, 64);
    ctx.font = "7px Arial";
    ctx.fillText(x + ',' + y, (x * 64)+1, (y * 64)+30);
    ctx.stroke();
  }

  const renderDoor = (ctx, cell, x, y) => {
    const door = findDoor(x, y)
    if (door && !door.open && !isEmpty(cell)) {
      ctx.fillStyle = 'brown';
      switch (door.side) {
        case Side.RIGHT: {
          ctx.fillRect((x * 64) + 62, y * 64, 4, 64);
          if (door.locked) {
            ctx.fillStyle = 'grey'
            ctx.fillRect((x*64) + 60, (y*64)+28, 8, 8)
          }
          break;
        }
        case Side.LEFT: {
          ctx.fillRect((x * 64)-2, y * 64, 4, 64);
          if (door.locked) {
            ctx.fillStyle = 'grey'
            ctx.fillRect((x*64)-4, (y*64)+28, 8, 8)
          }
          break;
        }
        case Side.UP: {
          ctx.fillRect(x * 64, (y * 64) - 2, 64, 4);
          if (door.locked) {
            ctx.fillStyle = 'grey'
            ctx.fillRect((x*64)+30, (y*64)-4, 8, 8)
          }
          break;
        }
        case Side.DOWN: {
          ctx.fillRect(x * 64, (y * 64) + 62, 64, 4);
          if (door.locked) {
            ctx.fillStyle = 'grey'
            ctx.fillRect((x*64)+28, (y*64)+60, 8, 8)
          }
          break;
        }
      }
    }
  }

  const renderActors = (ctx, cell, x, y, actors) => {
    ctx.beginPath();
    const hero = state.heroes.find((hero) => hero.position.x === x && hero.position.y === y)
    if (hero) {
      ctx.beginPath();
      ctx.arc((x*64)+16, (y*64)+16, 13, 0, 2 * Math.PI);
      ctx.strokeStyle = hero.colour;
      ctx.stroke();
      ctx.drawImage(actors, 4*16, 0, 16, 16, x*64, y*64, 64, 64);
    } else {
      const monster = state.dungeon.layout.monsters.find((monster) => monster.position.x === x && monster.position.y === y);
      if (monster && monster.health > 0 && !isEmpty(cell)) {
        ctx.beginPath();
        ctx.strokeStyle = monster.colour;
        ctx.fillStyle = monster.colour;
        ctx.arc((x*64)+16, (y*64)+16, 10, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.font = "7px Arial";
        ctx.fillStyle = 'black';
        const monsterText = monster.name[0] + '(' + monster.health + ')'
        switch (monster.type) {
          case MonsterType.ORCH: ctx.drawImage(actors, 64, 16, 16, 16, x * 64, y * 64, 64, 64); break;
          case MonsterType.TROLL: ctx.drawImage(actors, 48, 16, 16, 16, x * 64, y * 64, 64, 64); break;
          default: ctx.drawImage(actors, 16, 16, 16, 16, x * 64, y * 64, 64, 64); break;
        }
        ctx.fillText(monsterText, (x*64)+8, (y*64)+16)
      }
    }
    ctx.stroke();
  }

  const isEmpty = (cell) => cell === ' ' || !state.dungeon.discoveredRooms.includes(cell);
  const findDoor = (x, y) => state.dungeon.layout.doors.find((door) => door.x === x && door.y === y)
</script>
<canvas width="860" height="750" id="gameBoard"></canvas>