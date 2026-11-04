<script lang="ts">
  import { setContext } from 'svelte';
  import DeckTable from '../../deck/ui/DeckTable.svelte';
  import type { GameUiProps } from '../../ui';
  import { artFor } from './art';
  import { guide } from './guide';

  let { conn, room }: GameUiProps = $props();

  setContext('deck-art', artFor);
  setContext('deck-guide', guide);
</script>

<DeckTable {conn} {room} />
