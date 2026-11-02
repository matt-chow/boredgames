<script lang="ts">
  import Dialog from '../../../hub/Dialog.svelte';
  import type { BohnanzaConfig } from '../rules/config';

  let { open = $bindable(false), config = null }: { open: boolean; config?: BohnanzaConfig | null } = $props();
</script>

<Dialog bind:open title="How to play" wide>
  <div class="how">
    <p class="lead">Plant beans, trade constantly, and harvest fields for coins. Most coins when the deck runs out for the third time wins.</p>

    <h3>Your hand never changes order</h3>
    <p>You must play cards from the <b>front</b> of your hand (marked FRONT). New cards go to the back. You can’t rearrange — trading is how you get rid of awkward beans.</p>

    <h3>Fields</h3>
    <p>Each field holds one kind of bean, as many as you like. With 3 players you have three fields; with 4–5, two. Harvest a field any time for coins on the card’s beanometer (the row of numbers along the bottom of the card). A field holding a single bean can’t be harvested while another field holds more than one.</p>

    <h3>A turn, in four steps</h3>
    <ol>
      <li><b>Plant</b> your front card. You may then plant the next one too. If it doesn’t match any field, harvest one first.</li>
      <li><b>Turn over two cards</b> and trade. Anyone may trade or give cards to the active player; every trade involves them. Others can only offer to the active player.</li>
      <li><b>Plant</b> the turned-over cards you kept and every card you received. Everyone does this.</li>
      <li><b>Draw</b> three cards to the back of your hand. Your turn ends.</li>
    </ol>

    <h3>Trading here</h3>
    <p>Press <b>Offer</b>, tap cards from your hand (or the turned-over cards if it’s your turn) to give, and pick beans you’d like back. Dashed slips are proposals; nothing moves until the receiver accepts. Leave one side empty to make a donation or ask for a gift. Counter turns an offer around.</p>

    <h3>Controls</h3>
    <p>Drag a card onto a highlighted field, or tap the card then the field. Long-press or right-click any card to look closer. On the table, drag the background to pan and scroll or pinch to zoom.</p>

    {#if config && (config.threeNewBeans || config.fieldBean || config.beanCoin || config.magpie)}
      <h3>Variants at this table</h3>
      <ul>
        {#if config.threeNewBeans}<li><b>Three New Bean Types</b>: every player draws one card in step 4; extra bean types are in the deck.</li>{/if}
        {#if config.fieldBean}<li><b>Field Bean</b>: harvest two Field Beans to gain a third field. Every player draws one card in step 4.</li>{/if}
        {#if config.beanCoin}<li><b>Bean Coin</b>: when your fields are worth enough, claim the Bean Coin. Its holder draws four; a player whose fields are worth nothing draws two. A revealed Blue Bean stops a claim.</li>{/if}
        {#if config.magpie}<li><b>Magpie</b>: a Magpie at the front of your hand can be played in step 1 to steal the top bean of a field from up to two players.</li>{/if}
      </ul>
    {/if}
  </div>
</Dialog>

<style>
  .how {
    color: var(--ink-2);
    font-size: 15px;
    line-height: 1.55;
    max-width: 68ch;
  }
  .lead {
    color: var(--ink);
    font-size: 17px;
    margin-top: 0;
  }
  h3 {
    color: var(--ink);
    font-size: 15px;
    margin: 20px 0 4px;
  }
  p {
    margin: 0;
  }
  ol,
  ul {
    margin: 4px 0 0;
    padding-left: 22px;
  }
  li {
    margin: 4px 0;
  }
  b {
    color: var(--ink);
  }
</style>
