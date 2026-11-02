<script lang="ts">
  import { router } from './lib/router.svelte';
  import Hub from '../hub/Hub.svelte';
  import RoomPage from '../hub/RoomPage.svelte';
  import Toasts from '../hub/Toasts.svelte';
</script>

{#if router.route.page === 'room'}
  {#key router.route.code}
    <RoomPage code={router.route.code} />
  {/key}
{:else}
  <Hub />
{/if}
<Toasts />
