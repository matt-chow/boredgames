<script lang="ts">
  import { KINDS, ROLES, type Role } from '../rules/roles';
  import { artOf } from './text';

  /**
   * An influence card: an engraved portrait in a double-ruled frame with a cartouche, face up (`role`) or face down.
   * `up` marks a revealed, lost card. `size`: lg in the hand, md in dialogs, sm on the table.
   */
  let { role = null, up = false, size = 'sm', card = undefined }: { role?: Role | null; up?: boolean; size?: 'lg' | 'md' | 'sm'; card?: string } = $props();
  const info = $derived(role ? ROLES[role] : null);
</script>

<div class="pz-card {size}" class:lost={up} data-card={card} role="img" aria-label={info ? `${info.name}${up ? ', revealed' : ''}` : 'A hidden card'}>
  {#if info}
    <img src={artOf(role!)} alt="" draggable="false" />
    <span class="frame" aria-hidden="true"></span>
    <span class="plate" aria-hidden="true">
      <span class="nm">{info.name}</span>
      {#if size !== 'sm'}<span class="tx">{KINDS[info.action].name}{info.blocks ? ` · blocks ${KINDS[info.blocks].name}` : ''}</span>{/if}
    </span>
    {#if up}<span class="seal" aria-hidden="true">Revealed</span>{/if}
  {:else}
    <img src={artOf('back')} alt="" draggable="false" />
  {/if}
</div>

<style>
  .pz-card {
    --w: 48px;
    position: relative;
    flex: none;
    width: var(--w);
    aspect-ratio: 5 / 7;
    border-radius: calc(var(--w) * 0.05);
    overflow: hidden;
    background: var(--pz-paper);
    box-shadow: var(--shadow-1);
    outline: 1px solid rgb(0 0 0 / 0.4);
    user-select: none;
  }
  .md {
    --w: 112px;
  }
  .lg {
    --w: clamp(118px, 30vw, 156px);
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* The engraver's double rule: a heavy sepia line with a fine one inside it. */
  .frame {
    position: absolute;
    inset: calc(var(--w) * 0.035);
    border: calc(var(--w) * 0.018 + 1px) solid var(--pz-sepia);
    box-shadow: inset 0 0 0 calc(var(--w) * 0.02) var(--pz-paper), inset 0 0 0 calc(var(--w) * 0.03) var(--pz-sepia);
    pointer-events: none;
  }
  .plate {
    position: absolute;
    left: 12%;
    right: 12%;
    bottom: 5%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 3% 4%;
    color: var(--pz-paper-ink);
    background: var(--pz-paper);
    border: 1px solid var(--pz-sepia);
    border-radius: calc(var(--w) * 0.08);
  }
  .nm {
    font: 700 calc(var(--w) * 0.098) / 1.1 var(--pz-serif);
    white-space: nowrap;
    font-variant: small-caps;
    letter-spacing: 0.04em;
  }
  .tx {
    font-size: calc(var(--w) * 0.068);
    line-height: 1.2;
    text-align: center;
    color: var(--pz-paper-ink-2);
  }
  .sm .plate {
    left: 4%;
    right: 4%;
    padding: 1px 2px;
  }
  .sm .nm {
    font-size: 8px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lost img {
    filter: grayscale(0.7) brightness(0.8);
  }
  .seal {
    position: absolute;
    top: 38%;
    left: 50%;
    padding: 1px 6px;
    font: 700 calc(var(--w) * 0.08 + 3px) / 1.3 var(--pz-serif);
    white-space: nowrap;
    color: var(--pz-paper);
    background: var(--pz-blood);
    border: 1px solid var(--pz-gilt);
    transform: translateX(-50%) rotate(-14deg);
  }
  .sm .seal {
    font-size: 7px;
    padding: 0 2px;
  }
</style>
