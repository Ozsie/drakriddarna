<script>
  import { onMount } from "svelte";

  export let state

  onMount(() => {
    render();
    setInterval(render, 100)
  });

  const render = () => {
    if (!state || !document) return;
    const c = document.getElementById("characterBoard");
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.stroke();
    state.heroes.forEach((hero, index) => renderHeroStats(ctx, hero, index))
  }

  const renderHeroStats = (ctx, hero, index) => {
    const isCurrent = hero === state.currentActor
    const name = isCurrent ? '> ' + hero.name : hero.name
    ctx.strokeStyle = 'black';
    ctx.font = "18px Arial";
    ctx.fillText(name, 16, (index * 128)+30);
    ctx.fillText('HP: ' + hero.health, 16, (index*128) + 50)
    ctx.fillText('Actions: ' + hero.actions, 16, (index*128) + 70)
    ctx.fillText('Moves: ' + hero.movement, 16, (index*128) + 90)
    ctx.stroke();
  }

</script>
<canvas id="characterBoard" height="700" width="170"></canvas>