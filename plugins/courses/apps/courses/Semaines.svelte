<script lang="ts">
  // Les quatre dernières semaines et la semaine en cours, la moyenne par semaine bien en vue, et « Voir tout » : toutes les semaines,
  // sur un mois, une année ou depuis le début.
  import { Modal, Segmented } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { budgetDeLaSemaine, moyenneSemaines, semainesRecentes, toutesLesSemaines, type Periode } from "../../src/calculs";
  import type { Session } from "../../src/session.svelte";
  import Barres from "./Barres.svelte";

  let { s }: { s: Session } = $props();

  const semaines = $derived(s.donnees ? semainesRecentes(s.donnees, s.aujourdhui, 5) : []);
  const budget = $derived(s.donnees ? budgetDeLaSemaine(s.donnees, s.reglages, s.aujourdhui) : s.reglages.budgetCents);
  let ouvert = $state(false);
  let periode = $state<Periode>("mois");
  const toutes = $derived(s.donnees ? toutesLesSemaines(s.donnees, s.aujourdhui, periode) : []);
</script>

<section class="bloc">
  <div class="bloc-titre">
    <h3>Semaines</h3>
    <button class="btn" onclick={() => (ouvert = true)}>Voir tout</button>
  </div>
  <div class="moy"><span class="petit">Moyenne par semaine</span><b class="num">{formatEuros(moyenneSemaines(semaines))}</b></div>
  <div class="zone"><Barres {semaines} budgetCents={budget} hauteur={0} /></div>
</section>

<Modal open={ouvert} titre="Toutes les semaines" onclose={() => (ouvert = false)} largeur={940}>
  <div class="barre">
    <Segmented
      label="Période"
      options={[{ value: "mois", label: "Mois" }, { value: "annee", label: "Année" }, { value: "total", label: "Total" }]}
      bind:value={periode}
    />
    <div class="moy"><span class="petit">Moyenne par semaine</span><b class="num">{formatEuros(moyenneSemaines(toutes))}</b></div>
  </div>
  <Barres semaines={toutes} budgetCents={budget} hauteur={260} />
</Modal>

<style>
  .moy {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-top: 4px;
  }
  .moy b {
    font-size: 24px;
    font-weight: 600;
  }
  .zone {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 190px;
    margin-top: 12px;
  }
  .zone :global(.barres) {
    flex: 1;
  }
  .barre {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
</style>