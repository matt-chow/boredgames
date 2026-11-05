<script lang="ts">
  import { setContext } from 'svelte';
  import MarketSetup from '../../deck/ui/MarketSetup.svelte';
  import type { GameUiProps } from '../../ui';
  import { artFor } from './art';

  let { conn, room }: GameUiProps = $props();
  setContext('deck-art', artFor);
</script>

<MarketSetup {conn} {room} />
