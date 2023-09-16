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
    state.heroes.forEach((hero, index) => {
      renderHeroCard(ctx, c, hero, index);
      renderHeroStats(ctx, hero, index);
      renderHeroEquipment(ctx, hero, index);
    });
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

  const renderHeroEquipment = (ctx, hero, index) => {
    ctx.fillText('Equipment', 16, (index*cardHeight) + 110)
    ctx.font = "12px Arial";
    ctx.fillText('🗡️ ' + hero.weapon.name + ' (' + hero.weapon.dice + ')', 16, (index*cardHeight) + 125)
    let armourString = 'None (0)';
    let shieldString = 'None (0)';
    if (hero.armour) {
      armourString = hero.armour.name + ' (' + hero.armour.defense + ')';
    }
    if (hero.shield) {
      shieldString = hero.shield.name + ' (' + hero.armour.dice + ')';
    }
    ctx.fillText('🧱 ' + armourString, 16, (index * cardHeight) + 142);
    ctx.fillText('🛡️ ' + shieldString, 16, (index * cardHeight) + 159);
  }

</script>
<canvas id="characterBoard" height="720" width="260"></canvas>