<script>
  import {
    isBlockedByHero,
    isBlockedByMonster,
    isDiscovered,
    isWalkable,
    liveHeroes,
    toArray
  } from "./game.ts";
  import { onMount } from "svelte";
  import { MonsterType, Side } from "./types.ts";
  import groundSprites from '$lib/Dungeon_Tileset.png';
  import actorSprites from '$lib/Dungeon_Character_2.png';
  import { EMPTY, WALL } from "./dungeons.ts";
  import { doMouseLogic } from "./hero/mouseLogic.ts";
  import { browser } from '$app/environment';
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

  const renderHero = (ctx, hero, actors) => {
    const x = hero.position.x;
    const y = hero.position.y;
    ctx.drawImage(actors, 4*16, 0, 16, 16, x*cellSize, y*cellSize, cellSize, cellSize);
    renderActionOnActor(ctx, hero, x, y)
    renderActorBar(ctx, hero, x, y);
    renderHealthBar(ctx, hero, x, y);
  }

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
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderGrid(ctx, cell, x, y))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderDoor(ctx, cell, x, y))
    });
    state.dungeon.layout.grid.forEach((row, y) => {
      toArray(row).forEach((cell, x) => renderActors(ctx, cell, x, y, actors))
    });
    const heroes = liveHeroes(state);
    heroes.forEach((hero) => {
      renderHero(ctx, hero, actors);
    });
    renderWalkableArea(ctx, state.currentActor);
    renderCurrentActor(ctx, state.currentActor);
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

  const renderHealthBar = (ctx, actor, x, y) => {
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'red';
    ctx.fillRect((x * cellSize) + 4, y*cellSize, (cellSize - 8), 4);
    ctx.fillStyle = 'green';
    ctx.fillRect((x * cellSize) + 4, y*cellSize, (cellSize - 8) * (actor.health/actor.maxHealth), 4);
    ctx.rect((x * cellSize) + 4, y*cellSize, (cellSize - 8), 4);
    ctx.stroke();
  }

  const renderActionOnActor = (ctx, hero,  x, y) => {
      var prevFillStyle = ctx.fillStyle;
      var prevStrokeStyle = ctx.strokeStyle;
      
      ctx.strokeStyle = "#080808";
      ctx.fillStyle = "darkred";
      for (let index = 0; index < hero.actions; index++) {
        
        ctx.fillRect((x * cellSize + 4 + 6*index) , y*cellSize + cellSize - 12, 5, 5);    
        ctx.rect((x * cellSize + 4 + 6*index) , y*cellSize + cellSize - 12, 5, 5); 
        ctx.stroke();
      }
        
      ctx.fillStyle = "blue";
      for (let index = 0; index < hero.movement; index++) {
        
        ctx.fillRect((x * cellSize + cellSize - 22 + 6*index) , y*cellSize + cellSize - 12, 5, 5);    
        ctx.rect((x * cellSize + cellSize - 22 + 6*index) , y*cellSize + cellSize - 12, 5, 5);    
        ctx.stroke();
      }

      ctx.fillStyle = prevFillStyle;
      ctx.strokeStyle = prevStrokeStyle;
  }

  const renderCurrentActor = (ctx, hero) => {
    if (hero === state.currentActor) {
      ctx.beginPath();
      ctx.strokeStyle = 'lightblue';
      ctx.lineWidth = 2;

      ctx.moveTo(hero.position.x * cellSize, hero.position.y * cellSize);
      ctx.lineTo(hero.position.x * cellSize + (cellSize/3), hero.position.y * cellSize);
      ctx.moveTo(hero.position.x * cellSize, hero.position.y * cellSize);
      ctx.lineTo(hero.position.x * cellSize, hero.position.y * cellSize + (cellSize/3));

      ctx.moveTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize);
      ctx.lineTo(hero.position.x * cellSize + (cellSize/3)*2, hero.position.y * cellSize);
      ctx.moveTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize);
      ctx.lineTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize + (cellSize/3));

      ctx.moveTo(hero.position.x * cellSize, hero.position.y * cellSize + cellSize);
      ctx.lineTo(hero.position.x * cellSize, hero.position.y * cellSize + (cellSize/3)*2);
      ctx.moveTo(hero.position.x * cellSize, hero.position.y * cellSize + cellSize);
      ctx.lineTo(hero.position.x * cellSize + (cellSize/3), hero.position.y * cellSize + cellSize);

      ctx.moveTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize + cellSize);
      ctx.lineTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize + (cellSize/3)*2);
      ctx.moveTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize + cellSize);
      ctx.lineTo(hero.position.x * cellSize + (cellSize/3)*2, hero.position.y * cellSize + cellSize);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  const renderWalkableArea = (ctx, hero) => {
    if (hero === state.currentActor && debugMode) {
      for (let pX = hero.position.x - hero.movement; pX <= hero.position.x + hero.movement; pX++) {
        for (let pY = hero.position.y - hero.movement; pY <= hero.position.y + hero.movement; pY++) {
          const discovered = isDiscovered(state.dungeon, pX, pY);
          if (discovered) {
            const blockedByMonster = isBlockedByMonster(state, pX, pY);
            const blockedByHeroes = isBlockedByHero(state, pX, pY);
            const walkable = isWalkable(state.dungeon.layout, pX, pY);
            if (!blockedByHeroes && !blockedByMonster && walkable) {
              ctx.fillStyle = "rgba(50, 50, 255, 0.08)";
              ctx.fillRect((pX * cellSize), pY * cellSize, cellSize, cellSize);
              ctx.stroke();
            }
          }
        }
      }
    }
  }

  const renderActors = (ctx, cell, x, y, actors) => {
    ctx.beginPath();
    const hero = state.heroes.find((hero) => hero.position.x === x && hero.position.y === y)
    if (!hero) {
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