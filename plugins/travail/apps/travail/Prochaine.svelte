<script lang="ts">
  // La prochaine mission (intérim ou réserve) : titre et net, dans combien de jours, du… au….
  import { formatEuros } from "@etabli/ui/money";
  import { dans, periodeCourte } from "../../src/affichage";
  import type { Session } from "../../src/session.svelte";
  import { prochaine } from "../../src/vue";

  let { s }: { s: Session } = $props();

  const m = $derived(s.donnees ? prochaine(s.donnees, s.reglages, s.aujourdhui) : null);
</script>

<section class="bloc">
  <p class="etiquette">Prochaine mission</p>
  {#if m}
    <div class="titre">
      <b>{m.titre}</b>
      <span class="num net">{formatEuros(m.netCents)}</span>
    </div>
    <div class="suite">
      <span class="num dans">{dans(s.aujourdhui, m.debut)}</span>
      <span class="petit num">{periodeCourte(m.debut, m.fin)}</span>
    </div>
  {:else}
    <p class="petit">Rien de prévu pour la suite.</p>
  {/if}
</section>

<style>
  .titre {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px 12px;
  }
  .titre b {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .net {
    font-size: 17px;
    font-weight: 600;
  }
  .suite {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 12px;
    margin-top: 6px;
  }
  .dans {
    font-size: 20px;
    font-weight: 600;
  }
</style>