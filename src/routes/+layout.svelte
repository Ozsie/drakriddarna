<script lang="ts">
  import '../styles/theme.css';
  interface Props {
    children?: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

{@render children?.()}
