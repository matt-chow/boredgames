<script lang="ts">
  import { setContext } from 'svelte';
  import DeckTable from '../../deck/ui/DeckTable.svelte';
  import type { GameUiProps } from '../../ui';
  import { artFor } from './art';
  import { guideFor } from './guide';

  let { conn, room }: GameUiProps = $props();

  setContext('deck-art', artFor);
  setContext('deck-guide', guideFor);
</script>

<DeckTable {conn} {room} />
