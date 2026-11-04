<script lang="ts">
  import { setContext } from 'svelte';
  import DeckTable from '../../deck/ui/DeckTable.svelte';
  import type { GameUiProps } from '../../ui';
  import { artFor } from './art';

  let { conn, room }: GameUiProps = $props();

  setContext('deck-art', artFor);
</script>

<DeckTable {conn} {room} />
