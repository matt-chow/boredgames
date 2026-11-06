<script lang="ts">
  import type { GameUiProps } from '../../ui';

  // Nothing to configure: the lobby's job here is to say what the two of them are about to do.
  let {}: GameUiProps = $props();
</script>

<section class="setup" aria-labelledby="dd-setup-h">
  <img src="/art/covers/dead-drop.svg" alt="" width="150" height="210" />
  <div>
    <h2 id="dd-setup-h" class="label">Before you start</h2>
    <p>Two rival agents. You each get <strong>two secret mission locations</strong> when the match begins.</p>
    <ol>
      <li><strong>Briefing.</strong> Talk freely and file a formal statement. Either can be a lie.</li>
      <li><strong>Secret orders.</strong> You both choose at once: Deliver, Investigate, Intercept or Decoy.</li>
      <li><strong>Report.</strong> Public signals show where, never what. Private findings are always true.</li>
    </ol>
    <p>Win with <strong>3 deliveries</strong> covering both locations, or <strong>2 interceptions</strong>. Seven rounds at most, about ten minutes.</p>
    <p class="muted">Both players press “I’m ready”, then the host starts.</p>
  </div>
</section>

<style>
  .setup {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  img {
    width: 150px;
    height: auto;
    border-radius: 3px;
    box-shadow: var(--shadow-2);
  }
  h2 {
    margin: 0 0 6px;
    font-size: 22px;
  }
  p {
    margin: 0 0 8px;
    color: var(--ink-2);
    font-size: 15px;
  }
  ol {
    margin: 0 0 8px;
    padding-left: 20px;
    color: var(--ink-2);
    font-size: 15px;
  }
  li + li {
    margin-top: 3px;
  }
  .muted {
    color: var(--ink-3);
  }
  @media (max-width: 480px) {
    .setup {
      grid-template-columns: 90px minmax(0, 1fr);
    }
    img {
      width: 90px;
    }
  }
</style>
