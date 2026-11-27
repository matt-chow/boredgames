<!-- A small painted vignette beside a line of text. Decorative only: it draws nothing when the painting is missing. -->
<script lang="ts">
  import { paint } from './assets';

  let { id, size = 40, round = false }: { id: string; size?: number; round?: boolean } = $props();
  const src = $derived(paint(id));
</script>

{#if src}<img class="spot" class:round {src} alt="" width={size} height={size} loading="lazy" decoding="async" draggable="false" />{/if}

<style>
  .spot {
    flex: none;
    object-fit: cover;
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.3);
  }
  .round {
    border-radius: 50%;
  }
</style>
