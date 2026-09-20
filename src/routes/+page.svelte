<script lang="ts">
  import Dungeon from '../components/Dungeon.svelte';
  import Characters from '../components/Characters.svelte';
  import Log from '../components/Log.svelte';
  import ButtonPad from '../components/ButtonPad.svelte';
  import buildInfo from '$lib/buildInfo.json';
  import Diary from '../components/Diary.svelte';
</script>

<style>
    @media screen and (max-width: 600px) {
        .container {
            width: 100%;
            background: aqua;
        }
        .characterSide {
            width: 100%;
            height: 10%;
            position: fixed;
        }
    }
    @media screen and (min-width: 601px) {
        .container {
            width: 100%;
            background: aqua;
            padding: 2px;
        }
        .characterSide {
            width: 15%;
            max-width: 240px;
            background: grey;
            float: left;
            padding-right: 10px;
        }
    }
</style>

<div class='container'>
  <div class="characterSide">
    <Characters />
    <Diary />
  </div>
  <Dungeon />
</div>
<div class='container' id='footer'>
  <ButtonPad buildInfo={buildInfo} />
  <Log />
</div>
