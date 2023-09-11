<script>
  import { onMount } from "svelte";

  export let state
  const cardHeight = 180;

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
    state.heroes.forEach((hero, index) => renderHeroCard(ctx, c, hero, index))
    state.heroes.forEach((hero, index) => renderHeroStats(ctx, hero, index))
  }

  const renderHeroCard = (ctx, c, hero, index) => {
    ctx.fillStyle = hero.colour
    ctx.fillRect(12, (index * cardHeight)+12, c.width, cardHeight-12)
    ctx.stroke();
    ctx.fillStyle = 'black'
  }
  const renderHeroStats = (ctx, hero, index) => {
    const isCurrent = hero === state.currentActor
    const name = (isCurrent ? '> ' + hero.name : hero.name) +
      ' - ' + hero.level + ' (' + hero.experience + ')'
    ctx.strokeStyle = 'black';
    ctx.font = "18px Arial";
    ctx.fillText(name, 16, (index * cardHeight)+30);
    ctx.fillText('HP: ' + hero.health, 16, (index*cardHeight) + 50)
    ctx.fillText('Actions: ' + hero.actions, 16, (index*cardHeight) + 70)
    ctx.fillText('Moves: ' + hero.movement, 16, (index*cardHeight) + 90)
    ctx.stroke();
  }

</script>
<canvas id="characterBoard" height="750" width="260"></canvas>