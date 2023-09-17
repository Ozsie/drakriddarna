<script>
  
  import HeroCard from "./HeroCard.svelte";

  import { onMount } from "svelte";
  
  /**
     * @type {{ heroes: any[]; currentActor: any; }}
     */
   export let state;
  const cardHeight = 180;

  onMount(() => {
    render();
    setInterval(render, 100)
  });

  const render = () => {
    if (!state || !document) return;
    const c = document.getElementById("characterBoard");
    const ctx = c.getContext("2d");
    
    const heroCards = document.getElementById("heroCard");
    
    
    heroCards.replaceChildren();
    

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.stroke();

    state.heroes.forEach((hero, index) => {
      
      const heroCard = document.createElement("div");

      const heroName = document.createElement("span");
      heroCard.appendChild(heroName);
      const heroHP = document.createElement("span");
      heroCard.appendChild(heroName);
      const heroActions = document.createElement("span");
      heroCard.appendChild(heroName);
      const heroMoves = document.createElement("span");
      heroCard.appendChild(heroName);
      const heroEquipment = document.createElement("span");
      heroCard.appendChild(heroName);
      const heroWeapon = document.createElement("span");
      heroCard.appendChild(heroName);
      const heroArmor = document.createElement("span");
      heroCard.appendChild(heroName);
      const heroShield = document.createElement("span");
      heroCard.appendChild(heroName);
      
      heroCard.innerHTML = "hej";
      
      renderHeroCard(ctx, c, hero, index);
      renderHeroStats(ctx, hero, index);
      renderHeroEquipment(ctx, hero, index);

      heroCards.appendChild(heroCard);
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
<!-- {#key state.heroes} -->
  {#each state.heroes as hero, i}
    {#key hero.movement}
      <HeroCard hero={hero} ></HeroCard>
     {/key}
  {/each}
<!-- {/key} -->
<div id="heroCard">


</div>
<canvas id="characterBoard" height="750" width="260"></canvas>