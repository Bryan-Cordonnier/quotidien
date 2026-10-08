<script lang="ts">
  // Les euros moyens dépensés chaque mois en courses (mois terminés), et ce qui est dépensé depuis le début du mois.
  import { formatEuros } from "@etabli/ui/money";
  import { moyenneMensuelle } from "../../src/calculs";
  import type { Session } from "../../src/session.svelte";

  let { s }: { s: Session } = $props();
  const m = $derived(s.donnees ? moyenneMensuelle(s.donnees, s.aujourdhui) : null);
</script>

<section class="bloc">
  <p class="etiquette">€ moyens dépensés</p>
  {#if m}
    <div class="grand num">{m.nbMois > 0 ? formatEuros(m.moyenneCents) : "—"}</div>
    <span class="petit">{m.nbMois > 0 ? `par mois, moyenne sur ${m.nbMois} mois` : "par mois : pas encore de mois terminé"}</span>
    <p class="petit" style="margin: 14px 0 0">Ce mois-ci : <b class="num">{formatEuros(m.ceMoisCents)}</b></p>
  {/if}
</section>

<style>
  .grand {
    margin-top: 6px;
    font-size: 34px;
    font-weight: 600;
    line-height: 1.1;
  }
</style>