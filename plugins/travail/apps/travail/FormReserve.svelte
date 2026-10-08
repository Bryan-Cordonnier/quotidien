<script lang="ts">
  // Une période de réserve : les jours de réserve (payés au tarif) et le nombre de jours hors base (payés à l'indemnité).
  import { Modal } from "@etabli/ui";
  import { jourDeInstant } from "@etabli/ui/civil";
  import { formatEuros } from "@etabli/ui/money";
  import { detailReserve } from "../../src/calculs";
  import { ajouterReserve } from "../../src/donnees";
  import { jourMois } from "../../src/affichage";
  import type { Session } from "../../src/session.svelte";

  let { s, onclose }: { s: Session; onclose: () => void } = $props();

  let libelle = $state("Réserve");
  let jour = $state(jourDeInstant(Date.now()));
  let jours = $state<string[]>([]);
  let horsBase = $state("0");
  let erreur = $state("");

  const ajouterJour = () => {
    if (!jours.includes(jour)) jours = [...jours, jour].sort();
  };
  const retirer = (j: string) => (jours = jours.filter((x) => x !== j));
  const net = $derived(detailReserve({ id: "r0", libelle, jours, horsBase: Number(horsBase) || 0 }, s.reglages).netCents);

  function enregistrer(): void {
    erreur = "";
    const brut = { libelle, jours, horsBase: Number(horsBase) || 0 };
    if (s.appliquer((d) => ajouterReserve(d, brut).donnees)) onclose();
    else erreur = s.message;
  }
</script>

<Modal open titre="Jours de réserve" {onclose} largeur={520}>
  {#if s.reglages.tarifReserveCents === 0}
    <p class="petit" style="margin: 0">Aucun tarif de jour de réserve n'est réglé (Paramètres → Travail) : seuls les jours hors base rapportent.</p>
  {/if}
  <div class="groupe"><label for="r-lib">Nom de la période</label><input id="r-lib" class="saisie" bind:value={libelle} autocomplete="off" /></div>
  <div class="groupe">
    <label for="r-jour">Ajouter un jour de réserve</label>
    <div class="actions">
      <input id="r-jour" class="saisie" style="width: auto" type="date" bind:value={jour} />
      <button class="btn" onclick={ajouterJour}>Ajouter ce jour</button>
    </div>
  </div>
  <div class="puces" aria-label="Jours de réserve">
    {#each jours as j (j)}<button class="btn sm" onclick={() => retirer(j)} aria-label="Retirer le {jourMois(j)}">{jourMois(j)} ×</button>{/each}
    {#if jours.length === 0}<span class="petit">Aucun jour ajouté.</span>{/if}
  </div>
  <div class="groupe"><label for="r-hb">Jours hors base</label><input id="r-hb" class="saisie num" bind:value={horsBase} inputmode="numeric" autocomplete="off" /></div>
  <p style="margin: 0">Net estimé : <b class="num">{formatEuros(net)}</b></p>
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}<button class="btn primary" onclick={enregistrer}>Ajouter la période</button>{/snippet}
</Modal>

<style>
  .puces {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
</style>