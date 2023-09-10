<script>
  import Stat from "./Stat.svelte";

  export let hero
  let { movement, actions, level, health } = hero
  export let state
</script>
<style>
    .currentHero {
        border-color: black;
        border-style: solid;
    }
</style>
<li style='background-color: {hero.colour}' class={state.currentActor === hero ? 'currentHero' : ''}>
  <div>
    <p>{hero.name}</p>
    <p>
        <Stat {level}/> |
        <span>Health: {health}</span> |
        <Stat {actions}/> |
        <span>Movement: {movement}</span>
    </p>
  </div>
</li>