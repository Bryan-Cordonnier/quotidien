<script lang="ts">
  // Régler la course : le montant payé et le magasin. La liste est alors verrouillée pour toujours et le ticket entre dans le budget de la semaine.
  import { Modal } from "@etabli/ui";
  import { parseEuros } from "@etabli/ui/money";
  import { magasinsConnus } from "../../src/calculs";
  import { baseDePrix, estimerListe } from "../../src/prix";
  import { reglerListe } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";

  let { s, listeId, onclose }: { s: Session; listeId: string; onclose: () => void } = $props();

  const liste = $derived(s.donnees?.listes.find((l) => l.id === listeId));
  const magasins = $derived(s.donnees ? magasinsConnus(s.donnees) : []);
  // svelte-ignore state_referenced_locally
  // Le magasin proposé d'abord : le moins cher d'après nos tickets pour cette liste, sinon le plus fréquent.
  const conseille = s.donnees && liste ? estimerListe(liste.articles.map((a) => a.nom), baseDePrix(s.donnees)).conseille?.magasin : undefined;
  // svelte-ignore state_referenced_locally
  let magasin = $state(conseille ?? (s.donnees ? (magasinsConnus(s.donnees)[0] ?? "") : ""));
  let montant = $state("");
  let erreur = $state("");

  function regler(): void {
    erreur = "";
    const cents = parseEuros(montant);
    if (cents === null || cents <= 0) {
      erreur = "Le montant payé s'écrit comme 41,20.";
      return;
    }
    if (s.appliquer((d) => reglerListe(d, listeId, { jour: s.aujourdhui, montantCents: cents, magasin }).donnees)) onclose();
    else erreur = s.message;
  }
</script>

<Modal open titre="Régler « {liste?.nom ?? ''} »" {onclose} largeur={460}>
  <p class="petit" style="margin: 0">Une fois réglée, la liste n'est plus modifiable. Elle reste consultable dans l'historique, et le ticket entre dans le budget de la semaine.</p>
  <div class="groupe">
    <label for="r-montant">Montant payé (€)</label>
    <input id="r-montant" class="saisie num" bind:value={montant} inputmode="decimal" autocomplete="off" onkeydown={(e) => e.key === "Enter" && regler()} />
  </div>
  <div class="groupe">
    <label for="r-mag">Magasin</label>
    <input id="r-mag" class="saisie" list="r-magasins" bind:value={magasin} placeholder="Leclerc Drive" autocomplete="off" />
    <datalist id="r-magasins">{#each magasins as m (m)}<option value={m}></option>{/each}</datalist>
  </div>
  <div class="photo">
    <button class="btn" disabled>📷 Photographier le ticket</button>
    <span class="petit">Plus tard : le ticket sera lu et chaque prix gardé avec sa marque et son produit exact, pour comparer les magasins. Pas encore disponible.</span>
  </div>
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}<button class="btn primary" onclick={regler}>Régler la course</button>{/snippet}
</Modal>

<style>
  .photo {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 12px;
    border: 1px dashed var(--border);
    border-radius: 10px;
  }
</style>