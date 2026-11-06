<script lang="ts">
  import { LOCATION_NAMES, type Loc } from '../rules/types';
  import { sceneOf } from './text';

  let { loc, count = null }: { loc: Loc; count?: number | null } = $props();
</script>

<div class="card">
  <img src={sceneOf(loc)} alt="" width="640" height="400" />
  <span class="t"><span class="n">{LOCATION_NAMES[loc]}</span>{#if count !== null}<span class="c" class:hit={count > 0}>{count} delivered</span>{/if}</span>
</div>

<style>
  .card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 12px 8px 6px;
    background: var(--dd-paper) url('/art/deaddrop/paper.svg');
    color: var(--dd-paper-ink);
    border-radius: 3px;
  }
  /* The folder's tab. */
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 34%;
    height: 7px;
    background: var(--dd-paper-rim);
    border-radius: 3px 8px 0 0;
  }
  img {
    width: 58px;
    height: 38px;
    flex: none;
    object-fit: cover;
    border: 1px solid var(--dd-paper-ink);
  }
  .t {
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-family: var(--dd-type);
    line-height: 1.2;
  }
  .n {
    font-weight: 700;
    font-size: 14px;
  }
  .c {
    font-size: 12px;
    color: var(--dd-paper-ink-2);
  }
  .c.hit {
    color: var(--dd-teal);
    font-weight: 700;
  }
</style>
