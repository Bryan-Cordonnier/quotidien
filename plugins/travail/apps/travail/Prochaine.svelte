<script lang="ts">
  // La prochaine mission : titre et net, dans combien de jours, du… au….
  import { formatEuros } from "@etabli/ui/money";
  import { dans, periodeCourte } from "../../src/affichage";
  import type { Session } from "../../src/session.svelte";
  import { missionProchaine, resume } from "../../src/vue";

  let { s }: { s: Session } = $props();

  const m = $derived(s.donnees ? missionProchaine(s.donnees, s.aujourdhui) : undefined);
  const r = $derived(s.donnees && m ? resume(s.donnees, s.reglages, m, s.aujourdhui) : null);
</script>

<section class="bloc">
  <p class="etiquette">Prochaine mission</p>
  {#if m && r}
    <div class="titre">
      <b>{r.titre}</b>
      <span class="num net">{formatEuros(r.netCents)}</span>
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