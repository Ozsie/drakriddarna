<script lang="ts">
  import { init, loadState } from '../game';
  import Dungeon from '../components/Dungeon.svelte';
  import Characters from '../components/Characters.svelte';
  import Log from '../components/Log.svelte';
  import ButtonPad from '../components/ButtonPad.svelte';
  import type { GameState } from '../types';
  import buildInfo from '$lib/buildInfo.json'
  import { browser } from '$app/environment';
  import { setLocale } from '$lib/translations';

  let state: GameState;
  let reloadGuard: string | null = null;
  if (browser) {
    reloadGuard = localStorage.getItem('reloadGuard');
  }
  if (reloadGuard) {
    state = loadState(JSON.parse(reloadGuard) as GameState)
  } else {
    state = init();
  }
  setLocale(state.settings['locale'] as string);
  let debugMode: boolean = state.settings['debug'] as boolean;
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
    <Characters {state}/>
  </div>
  <Dungeon bind:state={state} bind:debugMode={debugMode} />
</div>
<div class='container' id='footer'>
  <ButtonPad bind:state={state} bind:debugMode={debugMode} buildInfo={buildInfo} />
  <Log bind:state={state} />
</div>
