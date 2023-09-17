<!-- export type Actor = {
    name: string;
    actions: number;
    movement: number;
    defense: number;
    health: number;
    maxHealth: number;
    colour: Colour;
    experience: number;
    position: Position;
    level: Level;
    weapon: Weapon;
    armour?: Armour;
    shield?: Shield;
  } -->
<!-- <svelte:options tag="hero-card" /> -->
<script lang="ts">
    import type { Actor, Hero } from "./types";
    
    export let hero: Hero;
    // import { onMount } from "svelte";
  
    // export let state
    // const cardHeight = 180;
  
    // onMount(() => {
    //   render();
    //   setInterval(render, 100)
    // });


    // const render = () => {
    // if (!state || !document) return;
   
    // };
  
</script>


<div>
    <h3>{hero.name} - {hero.experience}</h3>
    <span>HP: {hero.health}</span>
    <span>Actions: {hero.actions}</span>
    <span>Moves: {hero.movement}</span>
    <span>Equipment: </span>
</div>