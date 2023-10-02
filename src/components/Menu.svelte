<script lang="ts">
  import type { MenuButtonProps } from './ComponentTypes';

  export let header: string;
  export let debugMode: boolean;
  export let buttons: MenuButtonProps[];
  export let footer: string;
  export let showMenu: boolean;
</script>
<style>
    .menuClosed {
        display: none;
    }
    .menuOpen {
        background: cornsilk;
        margin: auto;
        position: absolute;
        bottom: 110px;
        max-width: 240px;
        width: 15%;
        padding: 10px;
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
    }
    @media screen and (max-width: 600px) {
        .menuOpen {
            width: 80%;
            max-width: 80%;
        }
    }
    @media screen and (min-width: 601px) {
        .menuOpen {
            max-width: 240px;
        }
    }
    .menuButton {
        margin: auto;
        width: 100%;
        margin-bottom: 10px;
        border-top-right-radius: 8px;
        border-bottom-left-radius: 8px;
    }
    .infoRow {
        display: block;
        margin: auto;
        width: 100%;
        text-align: center;
        font-size: 7pt;
    }
</style>
<div class='{showMenu ? "menuOpen" : "menuClosed"}'>
  <span class='infoRow'>{header}</span>
  {#each buttons as button}
    {#if (button.debugModeOnly && debugMode) || !button.debugModeOnly}
      <button class='menuButton' on:click={button.onClick}>{button.label}</button>
    {/if}
  {/each}
  <span class='infoRow'>{footer}</span>
</div>