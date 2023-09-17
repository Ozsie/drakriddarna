<svelte:options tag="hero-card" />
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
   
    };
  
</script>


<div>
    <h3>test</h3>
    <span>HP: </span>
    <span>Actions: </span>
    <span>Moves: </span>
    <span>Equipment: </span>
</div>