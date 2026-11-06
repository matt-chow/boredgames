<script lang="ts">
  import type { StatementV } from '../rules/types';
  import { challengeText, claimText, clock, iconOf } from './text';

  /** A formal statement: a typed slip, so nobody mistakes it for chat. */
  let { st, names, me, canChallenge, onchallenge }: { st: StatementV; names: string[]; me: number; canChallenge: boolean; onchallenge: (st: StatementV) => void } = $props();

  const label = (seat: number) => (seat === me ? 'You' : names[seat]);
  const outcome = $derived(challengeText(st, label));
  const open = $derived(canChallenge && st.seat !== me && st.challengeable);
</script>

<div class="slip" class:challenged={!!st.challenge}>
  <p class="meta"><span class="kind">Formal statement</span> <span>{label(st.seat)} · Round {st.round} · {clock(st.at)}</span></p>
  <p class="claim">“{claimText(st.claim)}”</p>
  {#if outcome}
    <p class="out" class:sealed={st.challenge?.correct === undefined}><img src={iconOf('challenge')} alt="" width="20" height="20" /> <span>{outcome}</span></p>
  {/if}
  {#if open}
    <button class="btn small" onclick={() => onchallenge(st)}><img src={iconOf('challenge')} alt="" width="18" height="18" /> Challenge</button>
  {/if}
</div>

<style>
  .slip {
    padding: 8px 10px;
    background: var(--dd-paper);
    color: var(--dd-paper-ink);
    border-radius: 2px;
    border-left: 4px solid var(--dd-wine);
    font-family: var(--dd-type);
  }
  p {
    margin: 0;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0 10px;
    font-size: 12px;
    color: var(--dd-paper-ink-2);
  }
  .kind {
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--dd-wine);
  }
  .claim {
    margin-top: 2px;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.3;
  }
  .out {
    display: flex;
    gap: 6px;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--dd-paper-rim);
    font-size: 13px;
    line-height: 1.35;
  }
  .out img {
    flex: none;
  }
  .btn {
    margin-top: 6px;
    color: var(--dd-paper);
    background: var(--dd-wine);
    border-color: var(--dd-wine);
    font-family: var(--font-ui);
  }
</style>
